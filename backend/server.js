require('dotenv').config();
const express = require('express');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const MINI_APP_URL = process.env.MINI_APP_URL || 'https://your-app.vercel.app';

// API Keys for AI features
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased for image uploads

// In-memory storage (replace with database in production)
const users = new Map();
const transactions = new Map();

// Initialize bot
let bot;
if (BOT_TOKEN) {
  bot = new TelegramBot(BOT_TOKEN);
  
  if (WEBHOOK_URL) {
    bot.setWebHook(`${WEBHOOK_URL}/webhook`);
  }
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

// =====================================================
// TELEGRAM BOT (Existing functionality)
// =====================================================

const COMMANDS = {
  uz: {
    start: "Salom! 👋 Men Hamyon botiman - moliyaviy yordamchingiz.\n\n💰 Xarajatlaringizni kuzatish uchun quyidagi buyruqlardan foydalaning:",
    help: "📚 *Buyruqlar:*\n\n/start - Boshlash\n/balance - Balansni ko'rish\n/add - Tranzaksiya qo'shish\n/stats - Statistika\n/app - Mini ilovani ochish",
    balance: "💰 Sizning balansingiz:",
    addPrompt: "Tranzaksiya qo'shish:\n\nFormat: `summa tavsif`\nMasalan: `50000 taksi` yoki `-30000 tushlik`",
    added: "✅ Tranzaksiya qo'shildi!",
    stats: "📊 Sizning statistikangiz:",
  },
  ru: {
    start: "Привет! 👋 Я Hamyon бот - ваш финансовый помощник.\n\n💰 Используйте команды для отслеживания расходов:",
    help: "📚 *Команды:*\n\n/start - Начать\n/balance - Баланс\n/add - Добавить транзакцию\n/stats - Статистика\n/app - Открыть приложение",
    balance: "💰 Ваш баланс:",
    addPrompt: "Добавить транзакцию:\n\nФормат: `сумма описание`\nПример: `50000 такси` или `-30000 обед`",
    added: "✅ Транзакция добавлена!",
    stats: "📊 Ваша статистика:",
  },
  en: {
    start: "Hello! 👋 I'm Hamyon bot - your financial assistant.\n\n💰 Use commands to track your expenses:",
    help: "📚 *Commands:*\n\n/start - Start\n/balance - Check balance\n/add - Add transaction\n/stats - Statistics\n/app - Open Mini App",
    balance: "💰 Your balance:",
    addPrompt: "Add transaction:\n\nFormat: `amount description`\nExample: `50000 taxi` or `-30000 lunch`",
    added: "✅ Transaction added!",
    stats: "📊 Your statistics:",
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

function getUserLang(userId) {
  const user = users.get(userId);
  return user?.lang || 'uz';
}

function getT(userId) {
  return COMMANDS[getUserLang(userId)] || COMMANDS.uz;
}

async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text || '';
  const t = getT(userId);
  
  if (!users.has(userId)) {
    users.set(userId, {
      id: userId,
      firstName: msg.from.first_name,
      lastName: msg.from.last_name,
      username: msg.from.username,
      lang: msg.from.language_code?.startsWith('ru') ? 'ru' : 'uz',
      balance: 0,
      createdAt: new Date().toISOString(),
    });
    transactions.set(userId, []);
  }
  
  if (text.startsWith('/start')) {
    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📱 Open App', web_app: { url: MINI_APP_URL } }],
          [{ text: '➕ Add Transaction', callback_data: 'add' }],
          [{ text: '💰 Balance', callback_data: 'balance' }, { text: '📊 Stats', callback_data: 'stats' }],
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
    const user = users.get(userId);
    await bot.sendMessage(chatId, `${t.balance} *${user.balance.toLocaleString()} UZS*`, { parse_mode: 'Markdown' });
    return;
  }
  
  if (text.startsWith('/add')) {
    await bot.sendMessage(chatId, t.addPrompt, { parse_mode: 'Markdown' });
    return;
  }
  
  if (text.startsWith('/stats')) {
    const userTx = transactions.get(userId) || [];
    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthTx = userTx.filter(tx => tx.date.startsWith(thisMonth));
    
    const income = monthTx.filter(tx => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0);
    const expenses = monthTx.filter(tx => tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0);
    
    await bot.sendMessage(chatId, 
      `${t.stats}\n\n💚 Income: *${income.toLocaleString()}* UZS\n❤️ Expenses: *${expenses.toLocaleString()}* UZS\n\n📝 Transactions: ${monthTx.length}`,
      { parse_mode: 'Markdown' }
    );
    return;
  }
  
  if (text.startsWith('/app')) {
    await bot.sendMessage(chatId, '📱 Open the app:', {
      reply_markup: {
        inline_keyboard: [[{ text: '🚀 Open Hamyon', web_app: { url: MINI_APP_URL } }]],
      },
    });
    return;
  }
  
  const match = text.match(/^(-?\d+(?:\s*\d+)*)\s*(.*)$/);
  if (match) {
    const amount = parseInt(match[1].replace(/\s/g, ''));
    const description = match[2].trim() || 'Transaction';
    const categoryId = detectCategory(description);
    
    const tx = {
      id: uuidv4(),
      type: amount < 0 ? 'expense' : 'income',
      amount: amount,
      description,
      categoryId,
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toISOString().slice(11, 16),
      source: 'bot',
    };
    
    const userTx = transactions.get(userId) || [];
    userTx.unshift(tx);
    transactions.set(userId, userTx);
    
    const user = users.get(userId);
    user.balance += amount;
    users.set(userId, user);
    
    const emoji = amount < 0 ? '❤️' : '💚';
    await bot.sendMessage(chatId, 
      `${t.added}\n\n${emoji} *${Math.abs(amount).toLocaleString()}* UZS\n📝 ${description}\n📁 ${categoryId}`,
      { parse_mode: 'Markdown' }
    );
    return;
  }
}

async function handleCallback(query) {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;
  const t = getT(userId);
  
  if (data === 'add') {
    await bot.sendMessage(chatId, t.addPrompt, { parse_mode: 'Markdown' });
  } else if (data === 'balance') {
    const user = users.get(userId);
    await bot.sendMessage(chatId, `${t.balance} *${(user?.balance || 0).toLocaleString()} UZS*`, { parse_mode: 'Markdown' });
  } else if (data === 'stats') {
    const userTx = transactions.get(userId) || [];
    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthTx = userTx.filter(tx => tx.date.startsWith(thisMonth));
    
    const income = monthTx.filter(tx => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0);
    const expenses = monthTx.filter(tx => tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0);
    
    await bot.sendMessage(chatId, 
      `${t.stats}\n\n💚 Income: *${income.toLocaleString()}* UZS\n❤️ Expenses: *${expenses.toLocaleString()}* UZS`,
      { parse_mode: 'Markdown' }
    );
  }
  
  await bot.answerCallbackQuery(query.id);
}

// =====================================================
// API ROUTES
// =====================================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

app.get('/api/user/:telegramId', (req, res) => {
  const userId = parseInt(req.params.telegramId);
  const user = users.get(userId);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json(user);
});

app.post('/api/user', (req, res) => {
  const { telegramId, firstName, lastName, username, lang } = req.body;
  
  if (!telegramId) {
    return res.status(400).json({ error: 'telegramId required' });
  }
  
  const existing = users.get(telegramId);
  const user = {
    id: telegramId,
    firstName: firstName || existing?.firstName,
    lastName: lastName || existing?.lastName,
    username: username || existing?.username,
    lang: lang || existing?.lang || 'uz',
    balance: existing?.balance || 0,
    createdAt: existing?.createdAt || new Date().toISOString(),
  };
  
  users.set(telegramId, user);
  
  if (!transactions.has(telegramId)) {
    transactions.set(telegramId, []);
  }
  
  res.json(user);
});

app.get('/api/transactions/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  const userTx = transactions.get(userId) || [];
  
  res.json(userTx);
});

app.post('/api/transaction', (req, res) => {
  const { userId, amount, description, categoryId, type } = req.body;
  
  if (!userId || amount === undefined) {
    return res.status(400).json({ error: 'userId and amount required' });
  }
  
  const tx = {
    id: uuidv4(),
    type: type || (amount < 0 ? 'expense' : 'income'),
    amount: Number(amount),
    description: description || '',
    categoryId: categoryId || 'other',
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toISOString().slice(11, 16),
    source: 'api',
  };
  
  const userTx = transactions.get(userId) || [];
  userTx.unshift(tx);
  transactions.set(userId, userTx);
  
  const user = users.get(userId);
  if (user) {
    user.balance += tx.amount;
    users.set(userId, user);
  }
  
  res.json(tx);
});

app.delete('/api/transaction/:id', (req, res) => {
  const txId = req.params.id;
  const userId = parseInt(req.query.userId);
  
  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }
  
  const userTx = transactions.get(userId) || [];
  const txIndex = userTx.findIndex(tx => tx.id === txId);
  
  if (txIndex === -1) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  
  const [deleted] = userTx.splice(txIndex, 1);
  transactions.set(userId, userTx);
  
  const user = users.get(userId);
  if (user) {
    user.balance -= deleted.amount;
    users.set(userId, user);
  }
  
  res.json({ success: true, deleted });
});

app.get('/api/stats/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  const userTx = transactions.get(userId) || [];
  const user = users.get(userId);
  
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthTx = userTx.filter(tx => tx.date.startsWith(thisMonth));
  
  const income = monthTx.filter(tx => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0);
  const expenses = monthTx.filter(tx => tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0);
  
  const categories = {};
  monthTx.filter(tx => tx.amount < 0).forEach(tx => {
    categories[tx.categoryId] = (categories[tx.categoryId] || 0) + Math.abs(tx.amount);
  });
  
  res.json({
    balance: user?.balance || 0,
    monthlyIncome: income,
    monthlyExpenses: expenses,
    netSavings: income - expenses,
    transactionCount: monthTx.length,
    categoryBreakdown: categories,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Hamyon Backend running on port ${PORT}`);
  console.log(`📱 Mini App URL: ${MINI_APP_URL}`);
  if (WEBHOOK_URL) {
    console.log(`🔗 Webhook URL: ${WEBHOOK_URL}/webhook`);
  }
});