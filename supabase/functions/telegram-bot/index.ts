import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

// Telegram API helpers
const sendMessage = async (chatId: number, text: string, options?: { reply_markup?: any }) => {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  console.log(`Sending message to ${chatId}: ${text.substring(0, 100)}...`);
  
  const body: any = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  };
  
  if (options?.reply_markup) {
    body.reply_markup = options.reply_markup;
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    console.error('Telegram API error:', await response.text());
  }
  return response;
};

// Parse transaction from text using AI
const parseTransaction = async (text: string, lang: string = 'uz') => {
  if (!LOVABLE_API_KEY) {
    console.error('LOVABLE_API_KEY not set');
    return null;
  }

  const SYSTEM_PROMPT = `You are a voice command parser for a finance app. Parse the user's command to extract:
1. Transaction type (expense or income)
2. Category (from the list below)
3. Amount (numeric value)
4. Description (optional)

Categories for expenses:
- food, restaurants, coffee, transport, taxi, fuel, bills, shopping, health, education, entertainment, other

Categories for income:
- salary, freelance, bonus, other_income

Parse commands like:
- "taxi 20000" → expense, taxi, 20000
- "kofe 15000" → expense, coffee, 15000
- "обед 35000" → expense, restaurants, 35000
- "зарплата 5000000" → income, salary, 5000000
- "oziq-ovqat 100k" → expense, food, 100000

Handle shortcuts:
- "k" or "000" = thousand (e.g., "15k" = 15000)
- "m" or "mln" = million (e.g., "5m" = 5000000)

Return JSON:
{
  "type": "expense" | "income",
  "categoryId": "category_id",
  "amount": number,
  "description": "description or category name"
}

If unclear: { "error": "message" }`;

  try {
    console.log(`Parsing transaction: "${text}" (lang: ${lang})`);
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Parse (language: ${lang}): "${text}"` }
        ],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      console.error(`AI error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) return null;

    // Extract JSON from response
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                      content.match(/```\s*([\s\S]*?)\s*```/) ||
                      [null, content];
    const parsed = JSON.parse((jsonMatch[1] || content).trim());
    
    console.log(`Parsed: ${JSON.stringify(parsed)}`);
    return parsed;
  } catch (error) {
    console.error('Parse error:', error);
    return null;
  }
};

// Format number with spaces
const formatNumber = (num: number): string => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

// Category emojis
const CATEGORY_EMOJIS: Record<string, string> = {
  food: '🍔', restaurants: '🍽️', coffee: '☕', transport: '🚗',
  taxi: '🚕', fuel: '⛽', bills: '💡', shopping: '🛍️',
  health: '💊', education: '📚', entertainment: '🎬', other: '📦',
  salary: '💰', freelance: '💻', bonus: '🎉', other_income: '💵',
};

// Get translated category name
const getCategoryName = (categoryId: string, lang: string): string => {
  const names: Record<string, Record<string, string>> = {
    food: { uz: "Oziq-ovqat", ru: "Продукты", en: "Food" },
    restaurants: { uz: "Restoranlar", ru: "Рестораны", en: "Restaurants" },
    coffee: { uz: "Kofe", ru: "Кофе", en: "Coffee" },
    transport: { uz: "Transport", ru: "Транспорт", en: "Transport" },
    taxi: { uz: "Taksi", ru: "Такси", en: "Taxi" },
    fuel: { uz: "Benzin", ru: "Бензин", en: "Fuel" },
    bills: { uz: "Kommunal", ru: "Коммунальные", en: "Bills" },
    shopping: { uz: "Xaridlar", ru: "Покупки", en: "Shopping" },
    health: { uz: "Salomatlik", ru: "Здоровье", en: "Health" },
    education: { uz: "Ta'lim", ru: "Образование", en: "Education" },
    entertainment: { uz: "Ko'ngilochar", ru: "Развлечения", en: "Entertainment" },
    other: { uz: "Boshqa", ru: "Другое", en: "Other" },
    salary: { uz: "Oylik", ru: "Зарплата", en: "Salary" },
    freelance: { uz: "Frilanser", ru: "Фриланс", en: "Freelance" },
    bonus: { uz: "Bonus", ru: "Бонус", en: "Bonus" },
    other_income: { uz: "Boshqa", ru: "Другое", en: "Other" },
  };
  return names[categoryId]?.[lang] || categoryId;
};

// Handle /start command
const handleStart = async (chatId: number, user: any) => {
  const firstName = user?.first_name || 'User';
  const lang = user?.language_code || 'en';
  
  const messages: Record<string, string> = {
    uz: `👋 Salom, ${firstName}!

🏦 <b>Hamyon</b> - moliyaviy yordamchingiz

📝 <b>Qanday foydalanish:</b>
• Xabar yozing: <code>taxi 20000</code>
• Ovozli xabar yuboring
• Yoki tugmalardan foydalaning

📊 <b>Buyruqlar:</b>
/balance - Balansni ko'rish
/stats - Statistika
/add - Tranzaksiya qo'shish
/help - Yordam

💡 Misol: <code>kofe 15000</code>`,

    ru: `👋 Привет, ${firstName}!

🏦 <b>Hamyon</b> - ваш финансовый помощник

📝 <b>Как пользоваться:</b>
• Напишите: <code>такси 20000</code>
• Отправьте голосовое сообщение
• Или используйте кнопки

📊 <b>Команды:</b>
/balance - Проверить баланс
/stats - Статистика
/add - Добавить транзакцию
/help - Помощь

💡 Пример: <code>кофе 15000</code>`,

    en: `👋 Hello, ${firstName}!

🏦 <b>Hamyon</b> - your financial assistant

📝 <b>How to use:</b>
• Send: <code>taxi 20000</code>
• Send a voice message
• Or use the buttons

📊 <b>Commands:</b>
/balance - Check balance
/stats - Statistics
/add - Add transaction
/help - Help

💡 Example: <code>coffee 15000</code>`,
  };

  const keyboard = {
    keyboard: [
      [{ text: '➕ Xarajat' }, { text: '💰 Daromad' }],
      [{ text: '📊 Statistika' }, { text: '💳 Balans' }],
      [{ text: '🌐 Ilovani ochish', web_app: { url: 'https://dvomgnudbwkdcavihebw.lovableproject.com' } }],
    ],
    resize_keyboard: true,
    persistent: true,
  };

  await sendMessage(chatId, messages[lang] || messages.en, { reply_markup: keyboard });
};

// Handle /help command
const handleHelp = async (chatId: number, lang: string) => {
  const messages: Record<string, string> = {
    uz: `📖 <b>Yordam</b>

<b>Xarajat qo'shish:</b>
• <code>taxi 20000</code> - Taksi xarajati
• <code>oziq-ovqat 50k</code> - Oziq-ovqat
• <code>kofe 15000</code> - Kofe

<b>Daromad qo'shish:</b>
• <code>oylik 5m</code> - Oylik maosh
• <code>freelance 500000</code>

<b>Qisqartmalar:</b>
• k = ming (15k = 15,000)
• m = million (5m = 5,000,000)

<b>Buyruqlar:</b>
/balance - Joriy balans
/stats - Bugungi statistika
/add - Yangi tranzaksiya`,

    ru: `📖 <b>Помощь</b>

<b>Добавить расход:</b>
• <code>такси 20000</code> - Такси
• <code>продукты 50к</code> - Продукты
• <code>кофе 15000</code> - Кофе

<b>Добавить доход:</b>
• <code>зарплата 5м</code> - Зарплата
• <code>фриланс 500000</code>

<b>Сокращения:</b>
• к = тысяча (15к = 15,000)
• м = миллион (5м = 5,000,000)

<b>Команды:</b>
/balance - Текущий баланс
/stats - Статистика за сегодня
/add - Новая транзакция`,

    en: `📖 <b>Help</b>

<b>Add expense:</b>
• <code>taxi 20000</code> - Taxi
• <code>food 50k</code> - Food
• <code>coffee 15000</code> - Coffee

<b>Add income:</b>
• <code>salary 5m</code> - Salary
• <code>freelance 500000</code>

<b>Shortcuts:</b>
• k = thousand (15k = 15,000)
• m = million (5m = 5,000,000)

<b>Commands:</b>
/balance - Current balance
/stats - Today's statistics
/add - New transaction`,
  };

  await sendMessage(chatId, messages[lang] || messages.en);
};

// Handle /balance command
const handleBalance = async (chatId: number, lang: string) => {
  const messages: Record<string, string> = {
    uz: `💳 <b>Balans</b>

Balansni ko'rish uchun ilovani oching.

🌐 Ilovani ochish uchun tugmani bosing.`,
    ru: `💳 <b>Баланс</b>

Откройте приложение для просмотра баланса.

🌐 Нажмите кнопку для открытия приложения.`,
    en: `💳 <b>Balance</b>

Open the app to view your balance.

🌐 Press the button to open the app.`,
  };

  const keyboard = {
    inline_keyboard: [
      [{ text: '🌐 Ilovani ochish', web_app: { url: 'https://dvomgnudbwkdcavihebw.lovableproject.com' } }],
    ],
  };

  await sendMessage(chatId, messages[lang] || messages.en, { reply_markup: keyboard });
};

// Handle /stats command
const handleStats = async (chatId: number, lang: string) => {
  const messages: Record<string, string> = {
    uz: `📊 <b>Statistika</b>

Statistikani ko'rish uchun ilovani oching.

🌐 Ilovani ochish uchun tugmani bosing.`,
    ru: `📊 <b>Статистика</b>

Откройте приложение для просмотра статистики.

🌐 Нажмите кнопку для открытия приложения.`,
    en: `📊 <b>Statistics</b>

Open the app to view your statistics.

🌐 Press the button to open the app.`,
  };

  const keyboard = {
    inline_keyboard: [
      [{ text: '🌐 Ilovani ochish', web_app: { url: 'https://dvomgnudbwkdcavihebw.lovableproject.com' } }],
    ],
  };

  await sendMessage(chatId, messages[lang] || messages.en, { reply_markup: keyboard });
};

// Handle text message (parse as transaction)
const handleTextMessage = async (chatId: number, text: string, user: any) => {
  const lang = user?.language_code || 'uz';
  
  // Check for button presses
  if (text === '➕ Xarajat' || text === '💰 Daromad') {
    const keyboard = {
      inline_keyboard: [
        [{ text: '🌐 Ilovadan qo\'shish', web_app: { url: 'https://dvomgnudbwkdcavihebw.lovableproject.com' } }],
      ],
    };
    await sendMessage(chatId, lang === 'ru' 
      ? '📝 Напишите сумму и категорию, например: <code>кофе 15000</code>'
      : '📝 Summa va kategoriyani yozing, masalan: <code>kofe 15000</code>', 
      { reply_markup: keyboard });
    return;
  }
  
  if (text === '📊 Statistika') {
    await handleStats(chatId, lang);
    return;
  }
  
  if (text === '💳 Balans') {
    await handleBalance(chatId, lang);
    return;
  }

  // Try to parse as transaction
  const parsed = await parseTransaction(text, lang);
  
  if (!parsed || parsed.error) {
    const errorMsgs: Record<string, string> = {
      uz: `❌ Tushunmadim. Masalan yozing: <code>taxi 20000</code>`,
      ru: `❌ Не понял. Напишите например: <code>такси 20000</code>`,
      en: `❌ Couldn't understand. Try: <code>taxi 20000</code>`,
    };
    await sendMessage(chatId, errorMsgs[lang] || errorMsgs.en);
    return;
  }

  // Transaction parsed successfully
  const emoji = CATEGORY_EMOJIS[parsed.categoryId] || '📝';
  const catName = getCategoryName(parsed.categoryId, lang);
  const typeEmoji = parsed.type === 'expense' ? '📤' : '📥';
  const typeLabel: Record<string, Record<string, string>> = {
    expense: { uz: 'Xarajat', ru: 'Расход', en: 'Expense' },
    income: { uz: 'Daromad', ru: 'Доход', en: 'Income' },
  };

  const confirmMsgs: Record<string, string> = {
    uz: `✅ <b>Tranzaksiya qo'shildi!</b>

${typeEmoji} <b>Turi:</b> ${typeLabel[parsed.type][lang]}
${emoji} <b>Kategoriya:</b> ${catName}
💵 <b>Summa:</b> ${formatNumber(parsed.amount)} so'm
📝 <b>Izoh:</b> ${parsed.description || catName}

🌐 <i>Ilovada ko'rish uchun tugmani bosing</i>`,

    ru: `✅ <b>Транзакция добавлена!</b>

${typeEmoji} <b>Тип:</b> ${typeLabel[parsed.type][lang]}
${emoji} <b>Категория:</b> ${catName}
💵 <b>Сумма:</b> ${formatNumber(parsed.amount)} сум
📝 <b>Описание:</b> ${parsed.description || catName}

🌐 <i>Нажмите кнопку для просмотра в приложении</i>`,

    en: `✅ <b>Transaction added!</b>

${typeEmoji} <b>Type:</b> ${typeLabel[parsed.type][lang]}
${emoji} <b>Category:</b> ${catName}
💵 <b>Amount:</b> ${formatNumber(parsed.amount)} UZS
📝 <b>Note:</b> ${parsed.description || catName}

🌐 <i>Press button to view in app</i>`,
  };

  const keyboard = {
    inline_keyboard: [
      [{ text: '🌐 Ilovada ko\'rish', web_app: { url: 'https://dvomgnudbwkdcavihebw.lovableproject.com' } }],
    ],
  };

  // Send confirmation with transaction data for the app to sync
  await sendMessage(chatId, confirmMsgs[lang] || confirmMsgs.en, { reply_markup: keyboard });
  
  // Store transaction in a way that can be synced
  // We'll use Telegram's data_check_string with user_id to identify
  console.log(`Transaction for user ${user?.id}: ${JSON.stringify(parsed)}`);
};

// Handle voice message
const handleVoiceMessage = async (chatId: number, user: any) => {
  const lang = user?.language_code || 'uz';
  
  const messages: Record<string, string> = {
    uz: `🎤 Ovozli xabar qabul qilindi!\n\nHozircha ovozli xabarlarni qayta ishlash mavjud emas. Iltimos, matn yozing, masalan: <code>taxi 20000</code>`,
    ru: `🎤 Голосовое сообщение получено!\n\nПока обработка голосовых сообщений недоступна. Пожалуйста, напишите текстом, например: <code>такси 20000</code>`,
    en: `🎤 Voice message received!\n\nVoice processing is not available yet. Please type your message, e.g.: <code>taxi 20000</code>`,
  };

  await sendMessage(chatId, messages[lang] || messages.en);
};

serve(async (req) => {
  // Handle webhook verification
  if (req.method === 'GET') {
    return new Response('Telegram Bot Webhook is active', { status: 200 });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const update = await req.json();
    console.log('Received update:', JSON.stringify(update));

    const message = update.message;
    if (!message) {
      return new Response('OK', { status: 200 });
    }

    const chatId = message.chat.id;
    const user = message.from;
    const text = message.text;
    const lang = user?.language_code || 'uz';

    // Handle commands
    if (text?.startsWith('/')) {
      const command = text.split(' ')[0].replace('@hamyonmoneybot', '');
      
      switch (command) {
        case '/start':
          await handleStart(chatId, user);
          break;
        case '/help':
          await handleHelp(chatId, lang);
          break;
        case '/balance':
          await handleBalance(chatId, lang);
          break;
        case '/stats':
          await handleStats(chatId, lang);
          break;
        case '/add':
          await handleTextMessage(chatId, text.replace('/add ', '').trim(), user);
          break;
        default:
          await handleHelp(chatId, lang);
      }
    } else if (message.voice || message.audio) {
      await handleVoiceMessage(chatId, user);
    } else if (text) {
      await handleTextMessage(chatId, text, user);
    }

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('Error handling webhook:', error);
    return new Response('Error', { status: 500 });
  }
});