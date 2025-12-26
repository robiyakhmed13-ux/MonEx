require('dotenv').config();
const express = require('express');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const MINI_APP_URL = process.env.MINI_APP_URL || 'https://your-lovable-app.lovable.app';

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage (replace with database in production)
const users = new Map();
const transactions = new Map();

// Initialize bot
let bot;
if (BOT_TOKEN) {
  bot = new TelegramBot(BOT_TOKEN);
  
  // Set webhook if URL provided
  if (WEBHOOK_URL) {
    bot.setWebHook(`${WEBHOOK_URL}/webhook`);
  }
}

// Telegram Bot Commands
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

// Category detection
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

// Bot message handler
async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text || '';
  const t = getT(userId);
  
  // Ensure user exists
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
  
  // Commands
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
  
  // Parse transaction from message
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

// Callback query handler
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

// === API Routes ===

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Telegram webhook
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
    res.sendStatus(200); // Always return 200 to Telegram
  }
});

// Set webhook
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

// === User API ===

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

// === Transactions API ===

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

// === Stats API ===

app.get('/api/stats/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  const userTx = transactions.get(userId) || [];
  const user = users.get(userId);
  
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthTx = userTx.filter(tx => tx.date.startsWith(thisMonth));
  
  const income = monthTx.filter(tx => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0);
  const expenses = monthTx.filter(tx => tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0);
  
  // Category breakdown
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
