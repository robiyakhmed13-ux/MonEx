// Fixes a known node-telegram-bot-api issue with promise cancellations (must be set before requiring the lib)
process.env.NTBA_FIX_319 = '1';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const { v4: uuidv4 } = require('uuid');

const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const MINI_APP_URL = process.env.MINI_APP_URL || 'https://your-app.vercel.app';

// API Keys for AI features
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

// PostgreSQL connection
const DATABASE_URL = process.env.DATABASE_URL;
let pool = null;

if (DATABASE_URL) {
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  console.log('PostgreSQL connection configured');
}

// Initialize database tables
async function initDatabase() {
  if (!pool) {
    console.log('No DATABASE_URL - using in-memory storage (data will be lost on restart)');
    return;
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT UNIQUE NOT NULL,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        username VARCHAR(255),
        lang VARCHAR(10) DEFAULT 'uz',
        balance DECIMAL(20, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL,
        amount DECIMAL(20, 2) NOT NULL,
        description TEXT,
        category_id VARCHAR(50) DEFAULT 'other',
        date DATE DEFAULT CURRENT_DATE,
        time TIME DEFAULT CURRENT_TIME,
        source VARCHAR(50) DEFAULT 'app',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS limits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
        category_id VARCHAR(50) NOT NULL,
        amount DECIMAL(20, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS goals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        target_amount DECIMAL(20, 2) NOT NULL,
        current_amount DECIMAL(20, 2) DEFAULT 0,
        emoji VARCHAR(50) DEFAULT '🎯',
        deadline DATE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_telegram_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
      CREATE INDEX IF NOT EXISTS idx_limits_user ON limits(user_telegram_id);
      CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_telegram_id);
    `);
    console.log('Database tables initialized');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Fallback in-memory storage (when no DATABASE_URL)
const usersMemory = new Map();
const transactionsMemory = new Map();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health checks (useful for debugging "Failed to fetch" / CORS / env issues)
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'telegram-finance-hub', time: new Date().toISOString() });
});

app.get('/api/ai-health', (_req, res) => {
  res.json({
    ok: true,
    openaiConfigured: Boolean(OPENAI_API_KEY),
    alphaVantageConfigured: Boolean(ALPHA_VANTAGE_API_KEY),
    time: new Date().toISOString(),
  });
});

// Initialize bot (do not let bot init crash the API server)
let bot;
if (BOT_TOKEN) {
  try {
    bot = new TelegramBot(BOT_TOKEN, { polling: false });
    if (WEBHOOK_URL) {
      bot.setWebHook(`${WEBHOOK_URL}/webhook`);
    }
    console.log('Telegram bot initialized');
  } catch (e) {
    console.error('Telegram bot failed to initialize (API will still run):', e);
    bot = null;
  }
} else {
  console.log('No BOT_TOKEN set - Telegram bot disabled');
}


// =====================================================
// AI ENDPOINTS (Receipt Scanning & Voice Parsing)
// =====================================================

const RECEIPT_SYSTEM_PROMPT = `You are a receipt scanner AI. Analyze the receipt image and extract the following information in JSON format:

{
  "total": number (the final total amount in the local currency, just the number),
  "vendor": string (the store/business name),
  "date": string (date in YYYY-MM-DD format, use today's date if not visible),
  "category": string (one of: food, restaurants, coffee, transport, taxi, fuel, bills, shopping, health, education, entertainment, other),
  "items": [
    { "name": string, "price": number }
  ],
  "currency": string (detected currency code like UZS, USD, RUB, etc.)
}

Important rules:
1. Extract the TOTAL/GRAND TOTAL amount, not subtotals
2. If multiple prices exist, use the final/largest amount
3. For category, analyze the vendor name and items to determine the best fit
4. Always return valid JSON
5. If you cannot read the receipt clearly, return: {"error": "Could not read receipt", "total": 0}`;

const VOICE_SYSTEM_PROMPT = `You are a voice command parser for a finance app. Parse the user's voice command to extract:
1. Transaction type (expense or income)
2. Category (from the list below)
3. Amount (numeric value)
4. Description (optional, use category name if not provided)

Categories for expenses: food, restaurants, coffee, transport, taxi, fuel, bills, shopping, health, education, entertainment, other
Categories for income: salary, freelance, bonus, other_income

Return JSON format:
{
  "type": "expense" | "income",
  "categoryId": "category_id",
  "amount": number,
  "description": "optional description or category name"
}

If you can't parse the command, return: { "error": "Could not understand command" }`;

// Receipt Scanning Endpoint
app.post('/api/scan-receipt', async (req, res) => {
  try {
    const { image, mimeType, userId } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }

    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: "OpenAI API key not configured" });
    }

    console.log(`Processing receipt scan for user: ${userId}`);

    const imageUrl = image.startsWith('data:') 
      ? image 
      : `data:${mimeType || 'image/jpeg'};base64,${image}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: RECEIPT_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Please analyze this receipt and extract the transaction details." },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI error: ${response.status} - ${errorText}`);
      return res.status(500).json({ error: "Failed to process receipt" });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return res.status(500).json({ error: "No response from AI" });
    }

    let parsedReceipt;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        content.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, content];
      parsedReceipt = JSON.parse((jsonMatch[1] || content).trim());
    } catch (parseError) {
      const amountMatch = content.match(/(\d+[\d\s,.]*)/);
      parsedReceipt = {
        total: amountMatch ? parseFloat(amountMatch[1].replace(/\s/g, '').replace(',', '.')) : 0,
        vendor: "Unknown",
        category: "other",
        error: "Partial extraction"
      };
    }

    res.json({
      total: parsedReceipt.total || 0,
      amount: parsedReceipt.total || 0,
      vendor: parsedReceipt.vendor || "Unknown",
      description: parsedReceipt.vendor || parsedReceipt.items?.[0]?.name || "Receipt",
      category: parsedReceipt.category || "other",
      date: parsedReceipt.date || new Date().toISOString().slice(0, 10),
      items: parsedReceipt.items || [],
      currency: parsedReceipt.currency || "UZS",
    });

  } catch (error) {
    console.error("Error in scan-receipt:", error);
    res.status(500).json({ error: error.message || "Unknown error" });
  }
});

// Voice Parsing Endpoint
app.post('/api/parse-voice', async (req, res) => {
  try {
    const { text, lang } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: "No text provided" });
    }

    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: "OpenAI API key not configured" });
    }

    console.log(`Parsing voice command: "${text}" (lang: ${lang})`);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: VOICE_SYSTEM_PROMPT },
          { role: "user", content: `Parse this voice command (language: ${lang || 'en'}): "${text}"` }
        ],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI error: ${response.status} - ${errorText}`);
      return res.status(500).json({ error: "Failed to process command" });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return res.status(500).json({ error: "No response from AI" });
    }

    let parsed;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        content.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, content];
      parsed = JSON.parse((jsonMatch[1] || content).trim());
    } catch {
      return res.status(400).json({ error: "Could not parse command" });
    }

    res.json(parsed);

  } catch (error) {
    console.error("Error in parse-voice:", error);
    res.status(500).json({ error: error.message || "Unknown error" });
  }
});

// Stock Price Endpoint
app.post('/api/get-stock-price', async (req, res) => {
  try {
    const { symbol, type } = req.body;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }

    if (!ALPHA_VANTAGE_API_KEY) {
      return res.status(500).json({ error: 'Alpha Vantage API key not configured' });
    }

    let url;
    if (type === 'crypto') {
      url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${symbol}&to_currency=USD&apikey=${ALPHA_VANTAGE_API_KEY}`;
    } else {
      url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    let price = null;
    let change = 0;
    let changePercent = 0;

    if (type === 'crypto' && data['Realtime Currency Exchange Rate']) {
      price = parseFloat(data['Realtime Currency Exchange Rate']['5. Exchange Rate']);
    } else if (data['Global Quote']) {
      const quote = data['Global Quote'];
      price = parseFloat(quote['05. price']);
      change = parseFloat(quote['09. change']);
      changePercent = parseFloat(quote['10. change percent']?.replace('%', ''));
    }

    if (price === null) {
      if (data['Note'] || data['Information']) {
        return res.status(429).json({ error: 'API rate limit reached. Please try again later.' });
      }
      return res.status(404).json({ error: 'Could not fetch price for symbol: ' + symbol });
    }

    res.json({ 
      symbol, 
      price, 
      change, 
      changePercent,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching stock price:', error);
    res.status(500).json({ error: error.message || 'Unknown error' });
  }
});

// AI Copilot Endpoint - Financial behavioral analysis
const AI_COPILOT_PROMPT = `You are MonEX AI Copilot - a behavioral finance assistant that helps users understand their spending patterns and build better financial habits.

Analyze the user's transaction data and provide 2-4 actionable insights. Focus on:
1. Spending patterns and anomalies
2. Behavioral nudges (not just numbers)
3. Achievable micro-actions
4. Positive reinforcement when appropriate

Return JSON array of insights:
[
  {
    "type": "pattern" | "warning" | "achievement" | "suggestion",
    "severity": "low" | "medium" | "high",
    "icon": "emoji",
    "title": "Short title",
    "message": "Detailed message with specific numbers and actionable advice"
  }
]`;

app.post('/api/ai-copilot', async (req, res) => {
  try {
    const { transactions, balance, currency, limits, goals, lang } = req.body;
    
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: "OpenAI API key not configured" });
    }

    const userPrompt = `Analyze this financial data (respond in ${lang === 'ru' ? 'Russian' : lang === 'uz' ? 'Uzbek' : 'English'}):

Balance: ${balance} ${currency}
Recent transactions: ${JSON.stringify(transactions?.slice(0, 20) || [])}
Spending limits: ${JSON.stringify(limits || [])}
Savings goals: ${JSON.stringify(goals || [])}

Provide behavioral insights and actionable suggestions.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: AI_COPILOT_PROMPT },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI error: ${response.status} - ${errorText}`);
      return res.status(500).json({ error: "Failed to generate insights" });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return res.status(500).json({ error: "No response from AI" });
    }

    let insights;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        content.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, content];
      insights = JSON.parse((jsonMatch[1] || content).trim());
    } catch {
      insights = [{ type: "suggestion", severity: "low", icon: "💡", title: "Tip", message: content }];
    }

    res.json({ insights });

  } catch (error) {
    console.error("Error in ai-copilot:", error);
    res.status(500).json({ error: error.message || "Unknown error" });
  }
});

// Finance Planner Endpoint - Natural language goal planning
const FINANCE_PLANNER_PROMPT = `You are a financial goal planner. Parse the user's natural language goal and create a structured savings plan.

Return JSON:
{
  "name": "Goal name",
  "targetAmount": number,
  "deadline": "YYYY-MM-DD",
  "monthlyRequired": number,
  "weeklyRequired": number,
  "dailyRequired": number,
  "emoji": "relevant emoji",
  "tips": ["tip1", "tip2", "tip3"],
  "feasibility": "easy" | "moderate" | "challenging" | "difficult",
  "message": "Encouraging message about the goal"
}`;

app.post('/api/finance-planner', async (req, res) => {
  try {
    const { prompt, balance, currency, lang } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: "No prompt provided" });
    }

    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: "OpenAI API key not configured" });
    }

    console.log(`Planning goal: "${prompt}" (lang: ${lang})`);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: FINANCE_PLANNER_PROMPT },
          { role: "user", content: `Current balance: ${balance} ${currency}. Goal: "${prompt}". Respond in ${lang === 'ru' ? 'Russian' : lang === 'uz' ? 'Uzbek' : 'English'}.` }
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI error: ${response.status} - ${errorText}`);
      return res.status(500).json({ error: "Failed to create plan" });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return res.status(500).json({ error: "No response from AI" });
    }

    let plan;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        content.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, content];
      plan = JSON.parse((jsonMatch[1] || content).trim());
    } catch {
      return res.status(400).json({ error: "Could not parse plan" });
    }

    res.json(plan);

  } catch (error) {
    console.error("Error in finance-planner:", error);
    res.status(500).json({ error: error.message || "Unknown error" });
  }
});

// =====================================================
// DATABASE HELPER FUNCTIONS
// =====================================================

async function getUser(telegramId) {
  if (!pool) {
    return usersMemory.get(telegramId) || null;
  }
  const result = await pool.query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
  return result.rows[0] || null;
}

async function upsertUser(telegramId, data) {
  if (!pool) {
    const existing = usersMemory.get(telegramId);
    const user = {
      id: telegramId,
      telegram_id: telegramId,
      first_name: data.firstName || existing?.first_name,
      last_name: data.lastName || existing?.last_name,
      username: data.username || existing?.username,
      lang: data.lang || existing?.lang || 'uz',
      balance: existing?.balance || 0,
      created_at: existing?.created_at || new Date().toISOString(),
    };
    usersMemory.set(telegramId, user);
    if (!transactionsMemory.has(telegramId)) {
      transactionsMemory.set(telegramId, []);
    }
    return user;
  }

  const result = await pool.query(`
    INSERT INTO users (telegram_id, first_name, last_name, username, lang)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (telegram_id) DO UPDATE SET
      first_name = COALESCE($2, users.first_name),
      last_name = COALESCE($3, users.last_name),
      username = COALESCE($4, users.username),
      lang = COALESCE($5, users.lang),
      updated_at = NOW()
    RETURNING *
  `, [telegramId, data.firstName, data.lastName, data.username, data.lang]);
  return result.rows[0];
}

async function updateUserBalance(telegramId, delta) {
  if (!pool) {
    const user = usersMemory.get(telegramId);
    if (user) {
      user.balance = (user.balance || 0) + delta;
      usersMemory.set(telegramId, user);
    }
    return user;
  }

  const result = await pool.query(
    'UPDATE users SET balance = balance + $1, updated_at = NOW() WHERE telegram_id = $2 RETURNING *',
    [delta, telegramId]
  );
  return result.rows[0];
}

async function getUserTransactions(telegramId, limit = 200) {
  if (!pool) {
    return (transactionsMemory.get(telegramId) || []).slice(0, limit);
  }

  const result = await pool.query(`
    SELECT id, type, amount, description, category_id as "categoryId", 
           date::text, time::text, source, created_at
    FROM transactions 
    WHERE user_telegram_id = $1 
    ORDER BY created_at DESC 
    LIMIT $2
  `, [telegramId, limit]);
  return result.rows;
}

async function addTransaction(telegramId, tx) {
  if (!pool) {
    const userTx = transactionsMemory.get(telegramId) || [];
    const newTx = {
      id: uuidv4(),
      type: tx.type || (tx.amount < 0 ? 'expense' : 'income'),
      amount: Number(tx.amount),
      description: tx.description || '',
      categoryId: tx.categoryId || 'other',
      date: tx.date || new Date().toISOString().slice(0, 10),
      time: tx.time || new Date().toISOString().slice(11, 16),
      source: tx.source || 'api',
    };
    userTx.unshift(newTx);
    transactionsMemory.set(telegramId, userTx);
    
    // Update balance
    const user = usersMemory.get(telegramId);
    if (user) {
      user.balance = (user.balance || 0) + newTx.amount;
      usersMemory.set(telegramId, user);
    }
    return newTx;
  }

  const result = await pool.query(`
    INSERT INTO transactions (user_telegram_id, type, amount, description, category_id, date, time, source)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, type, amount, description, category_id as "categoryId", date::text, time::text, source
  `, [
    telegramId,
    tx.type || (tx.amount < 0 ? 'expense' : 'income'),
    tx.amount,
    tx.description || '',
    tx.categoryId || 'other',
    tx.date || new Date().toISOString().slice(0, 10),
    tx.time || new Date().toISOString().slice(11, 16),
    tx.source || 'api'
  ]);

  // Update user balance
  await updateUserBalance(telegramId, tx.amount);

  return result.rows[0];
}

async function deleteTransaction(telegramId, txId) {
  if (!pool) {
    const userTx = transactionsMemory.get(telegramId) || [];
    const txIndex = userTx.findIndex(tx => tx.id === txId);
    if (txIndex === -1) return null;
    
    const [deleted] = userTx.splice(txIndex, 1);
    transactionsMemory.set(telegramId, userTx);
    
    // Update balance
    const user = usersMemory.get(telegramId);
    if (user) {
      user.balance = (user.balance || 0) - deleted.amount;
      usersMemory.set(telegramId, user);
    }
    return deleted;
  }

  // Get amount before delete
  const txResult = await pool.query('SELECT amount FROM transactions WHERE id = $1 AND user_telegram_id = $2', [txId, telegramId]);
  if (txResult.rows.length === 0) return null;

  const amount = parseFloat(txResult.rows[0].amount);
  
  await pool.query('DELETE FROM transactions WHERE id = $1 AND user_telegram_id = $2', [txId, telegramId]);
  await updateUserBalance(telegramId, -amount);

  return { id: txId, amount };
}

// =====================================================
// TELEGRAM BOT HANDLERS
// =====================================================

const COMMANDS = {
  uz: {
    start: "Salom! Men Hamyon botiman - moliyaviy yordamchingiz.\n\nXarajatlaringizni kuzatish uchun quyidagi buyruqlardan foydalaning:",
    help: "*Buyruqlar:*\n\n/start - Boshlash\n/balance - Balansni ko'rish\n/add - Tranzaksiya qo'shish\n/stats - Statistika\n/app - Mini ilovani ochish",
    balance: "Sizning balansingiz:",
    addPrompt: "Tranzaksiya qo'shish:\n\nFormat: `summa tavsif`\nMasalan: `50000 taksi` yoki `-30000 tushlik`",
    added: "Tranzaksiya qo'shildi!",
    stats: "Sizning statistikangiz:",
  },
  ru: {
    start: "Привет! Я Hamyon бот - ваш финансовый помощник.\n\nИспользуйте команды для отслеживания расходов:",
    help: "*Команды:*\n\n/start - Начать\n/balance - Баланс\n/add - Добавить транзакцию\n/stats - Статистика\n/app - Открыть приложение",
    balance: "Ваш баланс:",
    addPrompt: "Добавить транзакцию:\n\nФормат: `сумма описание`\nПример: `50000 такси` или `-30000 обед`",
    added: "Транзакция добавлена!",
    stats: "Ваша статистика:",
  },
  en: {
    start: "Hello! I'm Hamyon bot - your financial assistant.\n\nUse commands to track your expenses:",
    help: "*Commands:*\n\n/start - Start\n/balance - Check balance\n/add - Add transaction\n/stats - Statistics\n/app - Open Mini App",
    balance: "Your balance:",
    addPrompt: "Add transaction:\n\nFormat: `amount description`\nExample: `50000 taxi` or `-30000 lunch`",
    added: "Transaction added!",
    stats: "Your statistics:",
  },
};

const CATEGORY_KEYWORDS = {
  taxi: ['taksi', 'taxi', 'такси', 'uber', 'yandex', 'bolt'],
  food: ['ovqat', 'food', 'еда', 'продукты', 'oziq', 'market'],
  restaurants: ['restoran', 'restaurant', 'ресторан', 'cafe', 'кафе', 'tushlik', 'обед', 'lunch', 'dinner'],
  transport: ['transport', 'транспорт', 'metro', 'bus', 'avtobus', 'автобус'],
  shopping: ['xarid', 'shopping', 'покупки', 'shop', 'магазин'],
  bills: ['kommunal', 'bills', 'коммунальные', 'gaz', 'suv', 'elektr', 'gas', 'water', 'electric'],
  entertainment: ['kino', 'cinema', 'кино', 'park', 'concert', 'konsert', 'концерт'],
  health: ['doktor', 'doctor', 'врач', 'apteka', 'pharmacy', 'аптека', 'hospital'],
  salary: ['oylik', 'salary', 'зарплата', 'maosh', 'daromad', 'income', 'доход'],
  coffee: ['kofe', 'coffee', 'кофе', 'tea', 'choy', 'чай'],
};

function detectCategory(text) {
  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return category;
    }
  }
  return 'other';
}

async function getUserLang(telegramId) {
  const user = await getUser(telegramId);
  return user?.lang || 'uz';
}

async function getT(telegramId) {
  const lang = await getUserLang(telegramId);
  return COMMANDS[lang] || COMMANDS.uz;
}

async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text || '';
  const t = await getT(userId);
  
  // Ensure user exists
  await upsertUser(userId, {
    firstName: msg.from.first_name,
    lastName: msg.from.last_name,
    username: msg.from.username,
    lang: msg.from.language_code?.startsWith('ru') ? 'ru' : 'uz',
  });
  
  if (text.startsWith('/start')) {
    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Open App', web_app: { url: MINI_APP_URL } }],
          [{ text: 'Add Transaction', callback_data: 'add' }],
          [{ text: 'Balance', callback_data: 'balance' }, { text: 'Stats', callback_data: 'stats' }],
        ],
      },
    };
    await bot.sendMessage(chatId, t.start, keyboard);
    return;
  }
  
  if (text.startsWith('/help')) {
    await bot.sendMessage(chatId, t.help, { parse_mode: 'Markdown' });
    return;
  }
  
  if (text.startsWith('/balance')) {
    const user = await getUser(userId);
    await bot.sendMessage(chatId, `${t.balance} *${(user?.balance || 0).toLocaleString()} UZS*`, { parse_mode: 'Markdown' });
    return;
  }
  
  if (text.startsWith('/add')) {
    await bot.sendMessage(chatId, t.addPrompt, { parse_mode: 'Markdown' });
    return;
  }
  
  if (text.startsWith('/stats')) {
    const userTx = await getUserTransactions(userId);
    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthTx = userTx.filter(tx => tx.date.startsWith(thisMonth));
    
    const income = monthTx.filter(tx => tx.amount > 0).reduce((s, tx) => s + parseFloat(tx.amount), 0);
    const expenses = monthTx.filter(tx => tx.amount < 0).reduce((s, tx) => s + Math.abs(parseFloat(tx.amount)), 0);
    
    await bot.sendMessage(chatId, 
      `${t.stats}\n\nIncome: *${income.toLocaleString()}* UZS\nExpenses: *${expenses.toLocaleString()}* UZS\n\nTransactions: ${monthTx.length}`,
      { parse_mode: 'Markdown' }
    );
    return;
  }
  
  if (text.startsWith('/app')) {
    await bot.sendMessage(chatId, 'Open the app:', {
      reply_markup: {
        inline_keyboard: [[{ text: 'Open Hamyon', web_app: { url: MINI_APP_URL } }]],
      },
    });
    return;
  }
  
  // Handle transaction input
  const match = text.match(/^(-?\d+(?:\s*\d+)*)\s*(.*)$/);
  if (match) {
    const amount = parseInt(match[1].replace(/\s/g, ''));
    const description = match[2].trim() || 'Transaction';
    const categoryId = detectCategory(description);
    
    const tx = await addTransaction(userId, {
      type: amount < 0 ? 'expense' : 'income',
      amount,
      description,
      categoryId,
      source: 'bot',
    });
    
    const icon = amount < 0 ? '−' : '+';
    await bot.sendMessage(chatId, 
      `${t.added}\n\n${icon} *${Math.abs(amount).toLocaleString()}* UZS\n${description}\n${categoryId}`,
      { parse_mode: 'Markdown' }
    );
    return;
  }
}

async function handleCallback(query) {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;
  const t = await getT(userId);
  
  if (data === 'add') {
    await bot.sendMessage(chatId, t.addPrompt, { parse_mode: 'Markdown' });
  } else if (data === 'balance') {
    const user = await getUser(userId);
    await bot.sendMessage(chatId, `${t.balance} *${(user?.balance || 0).toLocaleString()} UZS*`, { parse_mode: 'Markdown' });
  } else if (data === 'stats') {
    const userTx = await getUserTransactions(userId);
    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthTx = userTx.filter(tx => tx.date.startsWith(thisMonth));
    
    const income = monthTx.filter(tx => tx.amount > 0).reduce((s, tx) => s + parseFloat(tx.amount), 0);
    const expenses = monthTx.filter(tx => tx.amount < 0).reduce((s, tx) => s + Math.abs(parseFloat(tx.amount)), 0);
    
    await bot.sendMessage(chatId, 
      `${t.stats}\n\nIncome: *${income.toLocaleString()}* UZS\nExpenses: *${expenses.toLocaleString()}* UZS`,
      { parse_mode: 'Markdown' }
    );
  }
  
  await bot.answerCallbackQuery(query.id);
}

// =====================================================
// API ROUTES
// =====================================================

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: pool ? 'postgresql' : 'in-memory'
  });
});

app.post('/webhook', async (req, res) => {
  try {
    const update = req.body;
    
    if (update.message) {
      await handleMessage(update.message);
    } else if (update.callback_query) {
      await handleCallback(update.callback_query);
    }
    
    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(200);
  }
});

app.get('/setWebhook', async (req, res) => {
  if (!WEBHOOK_URL || !bot) {
    return res.status(400).json({ error: 'WEBHOOK_URL or BOT_TOKEN not set' });
  }
  
  try {
    await bot.setWebHook(`${WEBHOOK_URL}/webhook`);
    res.json({ success: true, webhook: `${WEBHOOK_URL}/webhook` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/user/:telegramId', async (req, res) => {
  try {
    const userId = parseInt(req.params.telegramId);
    const user = await getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/user', async (req, res) => {
  try {
    const { telegramId, firstName, lastName, username, lang } = req.body;
    
    if (!telegramId) {
      return res.status(400).json({ error: 'telegramId required' });
    }
    
    const user = await upsertUser(telegramId, { firstName, lastName, username, lang });
    res.json(user);
  } catch (error) {
    console.error('Error upserting user:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/transactions/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const userTx = await getUserTransactions(userId);
    res.json(userTx);
  } catch (error) {
    console.error('Error getting transactions:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/transaction', async (req, res) => {
  try {
    const { userId, amount, description, categoryId, type } = req.body;
    
    if (!userId || amount === undefined) {
      return res.status(400).json({ error: 'userId and amount required' });
    }
    
    const tx = await addTransaction(userId, {
      type: type || (amount < 0 ? 'expense' : 'income'),
      amount: Number(amount),
      description,
      categoryId,
      source: 'api',
    });
    
    res.json(tx);
  } catch (error) {
    console.error('Error adding transaction:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/transaction/:id', async (req, res) => {
  try {
    const txId = req.params.id;
    const userId = parseInt(req.query.userId);
    
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }
    
    const deleted = await deleteTransaction(userId, txId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json({ success: true, deleted });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stats/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const userTx = await getUserTransactions(userId);
    const user = await getUser(userId);
    
    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthTx = userTx.filter(tx => tx.date.startsWith(thisMonth));
    
    const income = monthTx.filter(tx => parseFloat(tx.amount) > 0).reduce((s, tx) => s + parseFloat(tx.amount), 0);
    const expenses = monthTx.filter(tx => parseFloat(tx.amount) < 0).reduce((s, tx) => s + Math.abs(parseFloat(tx.amount)), 0);
    
    const categories = {};
    monthTx.filter(tx => parseFloat(tx.amount) < 0).forEach(tx => {
      categories[tx.categoryId] = (categories[tx.categoryId] || 0) + Math.abs(parseFloat(tx.amount));
    });
    
    res.json({
      balance: parseFloat(user?.balance || 0),
      monthlyIncome: income,
      monthlyExpenses: expenses,
      netSavings: income - expenses,
      transactionCount: monthTx.length,
      categoryBreakdown: categories,
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Hamyon Backend running on port ${PORT}`);
    console.log(`Mini App URL: ${MINI_APP_URL}`);
    console.log(`Database: ${pool ? 'PostgreSQL' : 'In-memory (add DATABASE_URL for persistence)'}`);
    if (WEBHOOK_URL) {
      console.log(`Webhook URL: ${WEBHOOK_URL}/webhook`);
    }
  });
});
