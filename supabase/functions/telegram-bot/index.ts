import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

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

// Get voice file from Telegram
const getFile = async (fileId: string) => {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`;
  const response = await fetch(url);
  const data = await response.json();
  return data.result?.file_path;
};

// Download file from Telegram
const downloadFile = async (filePath: string): Promise<ArrayBuffer> => {
  const url = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
  const response = await fetch(url);
  return await response.arrayBuffer();
};

// Transcribe voice using OpenAI Whisper
const transcribeVoice = async (audioBuffer: ArrayBuffer, lang: string = 'uz'): Promise<string | null> => {
  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set');
    return null;
  }

  try {
    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: 'audio/ogg' });
    formData.append('file', blob, 'voice.ogg');
    formData.append('model', 'whisper-1');
    formData.append('language', lang === 'uz' ? 'uz' : lang === 'ru' ? 'ru' : 'en');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      console.error('Whisper API error:', await response.text());
      return null;
    }

    const result = await response.json();
    console.log(`Transcribed: "${result.text}"`);
    return result.text;
  } catch (error) {
    console.error('Transcription error:', error);
    return null;
  }
};

// Parse transaction from text using OpenAI
const parseTransaction = async (text: string, lang: string = 'uz') => {
  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set');
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

Parse commands in Uzbek, Russian, or English like:
- "taxi 20000" → expense, taxi, 20000
- "kofe 15000" → expense, coffee, 15000
- "обед 35000" → expense, restaurants, 35000
- "зарплата 5000000" → income, salary, 5000000
- "oziq-ovqat 100k" → expense, food, 100000
- "taksi uchun 20 ming" → expense, taxi, 20000

Handle shortcuts:
- "k", "ming", "тысяч" = thousand (e.g., "15k" = 15000)
- "m", "mln", "миллион" = million (e.g., "5m" = 5000000)

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
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Parse (language: ${lang}): "${text}"` }
        ],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      console.error(`OpenAI error: ${response.status}`);
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

// Save transaction to database
const saveTransaction = async (telegramUserId: number, parsed: any, currency: string = 'UZS') => {
  try {
    const { data, error } = await supabase
      .from('telegram_transactions')
      .insert({
        telegram_user_id: telegramUserId,
        type: parsed.type,
        category_id: parsed.categoryId,
        amount: parsed.type === 'expense' ? -Math.abs(parsed.amount) : Math.abs(parsed.amount),
        description: parsed.description,
        currency,
        source: 'telegram',
        synced: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return null;
    }

    console.log(`Saved transaction: ${data.id}`);
    return data;
  } catch (error) {
    console.error('Save error:', error);
    return null;
  }
};

// Format number with spaces
const formatNumber = (num: number): string => {
  return Math.abs(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
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

// Get user stats from database
const getUserStats = async (telegramUserId: number) => {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + '-01';

  const { data: transactions, error } = await supabase
    .from('telegram_transactions')
    .select('*')
    .eq('telegram_user_id', telegramUserId)
    .gte('created_at', monthStart + 'T00:00:00Z');

  if (error) {
    console.error('Stats query error:', error);
    return { todayExpense: 0, todayIncome: 0, monthExpense: 0, monthIncome: 0, count: 0 };
  }

  const todayTx = transactions?.filter(t => t.created_at.slice(0, 10) === today) || [];
  
  return {
    todayExpense: todayTx.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0),
    todayIncome: todayTx.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0),
    monthExpense: transactions?.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0) || 0,
    monthIncome: transactions?.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0) || 0,
    count: transactions?.length || 0,
  };
};

// Get expense breakdown for a period
const getExpenseBreakdown = async (telegramUserId: number, period: 'today' | 'week' | 'month' = 'today') => {
  const now = new Date();
  let startDate: string;
  
  switch (period) {
    case 'week':
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      startDate = weekAgo.toISOString().slice(0, 10) + 'T00:00:00Z';
      break;
    case 'month':
      startDate = now.toISOString().slice(0, 7) + '-01T00:00:00Z';
      break;
    default:
      startDate = now.toISOString().slice(0, 10) + 'T00:00:00Z';
  }

  const { data: rows, error } = await supabase
    .from('telegram_transactions')
    .select('amount, category_id, created_at, currency')
    .eq('telegram_user_id', telegramUserId)
    .gte('created_at', startDate);

  if (error) {
    console.error('Expense breakdown query error:', error);
    return { totalExpense: 0, totalIncome: 0, currency: 'UZS', top: [] as Array<{ categoryId: string; spent: number }>, period };
  }

  const expenses = (rows || []).filter(r => Number((r as any).amount) < 0);
  const incomes = (rows || []).filter(r => Number((r as any).amount) > 0);
  const currency = (rows?.[0] as any)?.currency || 'UZS';

  const map = new Map<string, number>();
  for (const r of expenses) {
    const cat = (r as any).category_id as string;
    const spent = Math.abs(Number((r as any).amount) || 0);
    map.set(cat, (map.get(cat) || 0) + spent);
  }

  const top = [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([categoryId, spent]) => ({ categoryId, spent }));

  const totalExpense = expenses.reduce((s, r) => s + Math.abs(Number((r as any).amount) || 0), 0);
  const totalIncome = incomes.reduce((s, r) => s + Number((r as any).amount) || 0, 0);

  return { totalExpense, totalIncome, currency, top, period };
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
• 🎤 Ovozli xabar yuboring
• Yoki tugmalardan foydalaning

📊 <b>Buyruqlar:</b>
/stats - Statistika
/help - Yordam

💡 Misol: <code>kofe 15000</code> yoki <code>oylik 5m</code>`,

    ru: `👋 Привет, ${firstName}!

🏦 <b>Hamyon</b> - ваш финансовый помощник

📝 <b>Как пользоваться:</b>
• Напишите: <code>такси 20000</code>
• 🎤 Отправьте голосовое сообщение
• Или используйте кнопки

📊 <b>Команды:</b>
/stats - Статистика
/help - Помощь

💡 Пример: <code>кофе 15000</code> или <code>зарплата 5м</code>`,

    en: `👋 Hello, ${firstName}!

🏦 <b>Hamyon</b> - your financial assistant

📝 <b>How to use:</b>
• Send: <code>taxi 20000</code>
• 🎤 Send a voice message
• Or use the buttons

📊 <b>Commands:</b>
/stats - Statistics
/help - Help

💡 Example: <code>coffee 15000</code> or <code>salary 5m</code>`,
  };

  const keyboardByLang: Record<string, any> = {
    uz: {
      keyboard: [
        [{ text: '➕ Xarajat' }, { text: '💰 Daromad' }],
        [{ text: '📊 Statistika' }, { text: '📅 Kunlik' }],
        [{ text: '❓ Yordam' }],
      ],
      resize_keyboard: true,
      persistent: true,
    },
    ru: {
      keyboard: [
        [{ text: '➕ Расход' }, { text: '💰 Доход' }],
        [{ text: '📊 Статистика' }, { text: '📅 Сводка' }],
        [{ text: '❓ Помощь' }],
      ],
      resize_keyboard: true,
      persistent: true,
    },
    en: {
      keyboard: [
        [{ text: '➕ Expense' }, { text: '💰 Income' }],
        [{ text: '📊 Stats' }, { text: '📅 Daily' }],
        [{ text: '❓ Help' }],
      ],
      resize_keyboard: true,
      persistent: true,
    },
  };

  await sendMessage(chatId, messages[lang] || messages.en, { reply_markup: keyboardByLang[lang] || keyboardByLang.en });
};

// Handle /help command
const handleHelp = async (chatId: number, lang: string) => {
  const messages: Record<string, string> = {
    uz: `📖 <b>Yordam</b>

<b>Xarajat qo'shish:</b>
• <code>taxi 20000</code> - Taksi xarajati
• <code>oziq-ovqat 50k</code> - Oziq-ovqat
• <code>kofe 15 ming</code> - Kofe

<b>🎤 Ovozli xabar:</b>
Shunchaki gapiring: "Taksi uchun yigirma ming"

<b>Daromad qo'shish:</b>
• <code>oylik 5m</code> - Oylik maosh
• <code>freelance 500000</code>

<b>Qisqartmalar:</b>
• k, ming = ming (15k = 15,000)
• m, mln = million (5m = 5,000,000)

<b>Buyruqlar:</b>
/stats - Bugungi statistika`,

    ru: `📖 <b>Помощь</b>

<b>Добавить расход:</b>
• <code>такси 20000</code> - Такси
• <code>продукты 50к</code> - Продукты
• <code>кофе 15 тысяч</code> - Кофе

<b>🎤 Голосовое сообщение:</b>
Просто скажите: "Такси двадцать тысяч"

<b>Добавить доход:</b>
• <code>зарплата 5м</code> - Зарплата
• <code>фриланс 500000</code>

<b>Сокращения:</b>
• к, тысяч = тысяча (15к = 15,000)
• м, млн = миллион (5м = 5,000,000)

<b>Команды:</b>
/stats - Статистика за сегодня`,

    en: `📖 <b>Help</b>

<b>Add expense:</b>
• <code>taxi 20000</code> - Taxi
• <code>food 50k</code> - Food
• <code>coffee 15000</code> - Coffee

<b>🎤 Voice message:</b>
Just say: "Taxi twenty thousand"

<b>Add income:</b>
• <code>salary 5m</code> - Salary
• <code>freelance 500000</code>

<b>Shortcuts:</b>
• k = thousand (15k = 15,000)
• m = million (5m = 5,000,000)

<b>Commands:</b>
/stats - Today's statistics`,
  };

  await sendMessage(chatId, messages[lang] || messages.en);
};

// Handle /stats command
const handleStats = async (chatId: number, telegramUserId: number, lang: string) => {
  const stats = await getUserStats(telegramUserId);
  
  const messages: Record<string, string> = {
    uz: `📊 <b>Statistika</b>

<b>Bugun:</b>
📤 Xarajat: ${formatNumber(stats.todayExpense)} so'm
📥 Daromad: ${formatNumber(stats.todayIncome)} so'm

<b>Bu oy:</b>
📤 Xarajat: ${formatNumber(stats.monthExpense)} so'm
📥 Daromad: ${formatNumber(stats.monthIncome)} so'm

📝 Jami tranzaksiyalar: ${stats.count}`,

    ru: `📊 <b>Статистика</b>

<b>Сегодня:</b>
📤 Расход: ${formatNumber(stats.todayExpense)} сум
📥 Доход: ${formatNumber(stats.todayIncome)} сум

<b>Этот месяц:</b>
📤 Расход: ${formatNumber(stats.monthExpense)} сум
📥 Доход: ${formatNumber(stats.monthIncome)} сум

📝 Всего транзакций: ${stats.count}`,

    en: `📊 <b>Statistics</b>

<b>Today:</b>
📤 Expense: ${formatNumber(stats.todayExpense)} UZS
📥 Income: ${formatNumber(stats.todayIncome)} UZS

<b>This month:</b>
📤 Expense: ${formatNumber(stats.monthExpense)} UZS
📥 Income: ${formatNumber(stats.monthIncome)} UZS

📝 Total transactions: ${stats.count}`,
  };

  await sendMessage(chatId, messages[lang] || messages.en);
};

// Handle daily expense summary with period selection
const handleDailySummary = async (chatId: number, telegramUserId: number, lang: string, period: 'today' | 'week' | 'month' = 'today') => {
  const daily = await getExpenseBreakdown(telegramUserId, period);

  const periodLabels: Record<string, Record<string, string>> = {
    today: { uz: "Bugungi", ru: "Сегодня", en: "Today's" },
    week: { uz: "Haftalik", ru: "За неделю", en: "This week's" },
    month: { uz: "Oylik", ru: "За месяц", en: "This month's" },
  };

  const header: Record<string, string> = {
    uz: `📅 <b>${periodLabels[period][lang]} xarajatlar</b>\n\n📤 Jami: ${formatNumber(daily.totalExpense)} ${daily.currency}\n📥 Daromad: ${formatNumber(daily.totalIncome)} ${daily.currency}`,
    ru: `📅 <b>Расходы ${periodLabels[period][lang].toLowerCase()}</b>\n\n📤 Итого: ${formatNumber(daily.totalExpense)} ${daily.currency}\n📥 Доход: ${formatNumber(daily.totalIncome)} ${daily.currency}`,
    en: `📅 <b>${periodLabels[period][lang]} expenses</b>\n\n📤 Total: ${formatNumber(daily.totalExpense)} ${daily.currency}\n📥 Income: ${formatNumber(daily.totalIncome)} ${daily.currency}`,
  };

  if (!daily.top.length) {
    const empty: Record<string, string> = {
      uz: header[lang] + `\n\n✅ Xarajat yo'q`,
      ru: header[lang] + `\n\n✅ Расходов нет`,
      en: header[lang] + `\n\n✅ No expenses`,
    };
    await sendMessage(chatId, empty[lang] || empty.en);
    return;
  }

  const lines = daily.top
    .map((x: { categoryId: string; spent: number }) => {
      const emoji = CATEGORY_EMOJIS[x.categoryId] || '🧾';
      const name = getCategoryName(x.categoryId, lang);
      return `${emoji} ${name}: ${formatNumber(x.spent)} ${daily.currency}`;
    })
    .join('\n');

  // Add period selection buttons
  const periodKeyboard = {
    inline_keyboard: [
      [
        { text: lang === 'uz' ? '📅 Bugun' : lang === 'ru' ? '📅 Сегодня' : '📅 Today', callback_data: 'period_today' },
        { text: lang === 'uz' ? '📆 Hafta' : lang === 'ru' ? '📆 Неделя' : '📆 Week', callback_data: 'period_week' },
        { text: lang === 'uz' ? '🗓 Oy' : lang === 'ru' ? '🗓 Месяц' : '🗓 Month', callback_data: 'period_month' },
      ]
    ]
  };

  await sendMessage(chatId, `${header[lang] || header.en}\n\n${lines}`, { reply_markup: periodKeyboard });
};

// Handle text message (parse as transaction)
const handleTextMessage = async (chatId: number, text: string, user: any) => {
  const lang = user?.language_code || 'uz';
  const telegramUserId = user?.id;
  
  // Check for button presses
  if (
    text === '➕ Xarajat' || text === '💰 Daromad' ||
    text === '➕ Расход' || text === '💰 Доход' ||
    text === '➕ Expense' || text === '💰 Income'
  ) {
    const promptMsgs: Record<string, string> = {
      uz: '📝 Summa va kategoriyani yozing yoki ovozli xabar yuboring.\n\nMisol: <code>kofe 15000</code>',
      ru: '📝 Напишите сумму и категорию или отправьте голосовое сообщение.\n\nПример: <code>кофе 15000</code>',
      en: '📝 Type the amount and category or send a voice message.\n\nExample: <code>coffee 15000</code>',
    };
    await sendMessage(chatId, promptMsgs[lang] || promptMsgs.en);
    return;
  }

  if (text === '📊 Statistika' || text === '📊 Статистика' || text === '📊 Stats') {
    await handleStats(chatId, telegramUserId, lang);
    return;
  }

  if (text === '📅 Kunlik' || text === '📅 Сводка' || text === '📅 Daily') {
    await handleDailySummary(chatId, telegramUserId, lang);
    return;
  }

  if (text === '❓ Yordam' || text === '❓ Помощь' || text === '❓ Help') {
    await handleHelp(chatId, lang);
    return;
  }

  // Try to parse as transaction
  const parsed = await parseTransaction(text, lang);
  
  if (!parsed || parsed.error) {
    const errorMsgs: Record<string, string> = {
      uz: `❌ Tushunmadim. Masalan yozing: <code>taxi 20000</code>\n\nYoki ovozli xabar yuboring 🎤`,
      ru: `❌ Не понял. Напишите например: <code>такси 20000</code>\n\nИли отправьте голосовое сообщение 🎤`,
      en: `❌ Couldn't understand. Try: <code>taxi 20000</code>\n\nOr send a voice message 🎤`,
    };
    await sendMessage(chatId, errorMsgs[lang] || errorMsgs.en);
    return;
  }

  // Save to database
  const saved = await saveTransaction(telegramUserId, parsed);
  if (!saved) {
    const errorMsgs: Record<string, string> = {
      uz: `❌ Xatolik yuz berdi. Qaytadan urinib ko'ring.`,
      ru: `❌ Произошла ошибка. Попробуйте ещё раз.`,
      en: `❌ An error occurred. Please try again.`,
    };
    await sendMessage(chatId, errorMsgs[lang] || errorMsgs.en);
    return;
  }

  // Transaction saved successfully
  const emoji = CATEGORY_EMOJIS[parsed.categoryId] || '📝';
  const catName = getCategoryName(parsed.categoryId, lang);
  const typeEmoji = parsed.type === 'expense' ? '📤' : '📥';
  const typeLabel: Record<string, Record<string, string>> = {
    expense: { uz: 'Xarajat', ru: 'Расход', en: 'Expense' },
    income: { uz: 'Daromad', ru: 'Доход', en: 'Income' },
  };

  const confirmMsgs: Record<string, string> = {
    uz: `✅ <b>Saqlandi!</b>

${typeEmoji} <b>Turi:</b> ${typeLabel[parsed.type][lang]}
${emoji} <b>Kategoriya:</b> ${catName}
💵 <b>Summa:</b> ${formatNumber(parsed.amount)} so'm`,

    ru: `✅ <b>Сохранено!</b>

${typeEmoji} <b>Тип:</b> ${typeLabel[parsed.type][lang]}
${emoji} <b>Категория:</b> ${catName}
💵 <b>Сумма:</b> ${formatNumber(parsed.amount)} сум`,

    en: `✅ <b>Saved!</b>

${typeEmoji} <b>Type:</b> ${typeLabel[parsed.type][lang]}
${emoji} <b>Category:</b> ${catName}
💵 <b>Amount:</b> ${formatNumber(parsed.amount)} UZS`,
  };

  await sendMessage(chatId, confirmMsgs[lang] || confirmMsgs.en);
};

// Handle voice message
const handleVoiceMessage = async (chatId: number, voice: any, user: any) => {
  const lang = user?.language_code || 'uz';
  const telegramUserId = user?.id;
  
  // Send processing message
  const processingMsgs: Record<string, string> = {
    uz: '🎤 Ovozli xabaringizni qayta ishlayman...',
    ru: '🎤 Обрабатываю голосовое сообщение...',
    en: '🎤 Processing your voice message...',
  };
  await sendMessage(chatId, processingMsgs[lang] || processingMsgs.en);

  try {
    // Get file path
    const filePath = await getFile(voice.file_id);
    if (!filePath) {
      throw new Error('Could not get file path');
    }

    // Download file
    const audioBuffer = await downloadFile(filePath);
    
    // Transcribe
    const transcription = await transcribeVoice(audioBuffer, lang);
    if (!transcription) {
      throw new Error('Transcription failed');
    }

    // Parse as transaction
    const parsed = await parseTransaction(transcription, lang);
    
    if (!parsed || parsed.error) {
      const errorMsgs: Record<string, string> = {
        uz: `🎤 Eshitdim: "<i>${transcription}</i>"\n\n❌ Tranzaksiya tushunilmadi. Masalan ayting: "Taksi yigirma ming"`,
        ru: `🎤 Услышал: "<i>${transcription}</i>"\n\n❌ Не удалось понять транзакцию. Например скажите: "Такси двадцать тысяч"`,
        en: `🎤 Heard: "<i>${transcription}</i>"\n\n❌ Couldn't understand transaction. Try saying: "Taxi twenty thousand"`,
      };
      await sendMessage(chatId, errorMsgs[lang] || errorMsgs.en);
      return;
    }

    // Save to database
    const saved = await saveTransaction(telegramUserId, parsed);
    if (!saved) {
      throw new Error('Failed to save transaction');
    }

    // Success message
    const emoji = CATEGORY_EMOJIS[parsed.categoryId] || '📝';
    const catName = getCategoryName(parsed.categoryId, lang);
    const typeEmoji = parsed.type === 'expense' ? '📤' : '📥';

    const successMsgs: Record<string, string> = {
      uz: `🎤 "<i>${transcription}</i>"

✅ <b>Saqlandi!</b>
${typeEmoji} ${catName} ${emoji}
💵 ${formatNumber(parsed.amount)} so'm`,

      ru: `🎤 "<i>${transcription}</i>"

✅ <b>Сохранено!</b>
${typeEmoji} ${catName} ${emoji}
💵 ${formatNumber(parsed.amount)} сум`,

      en: `🎤 "<i>${transcription}</i>"

✅ <b>Saved!</b>
${typeEmoji} ${catName} ${emoji}
💵 ${formatNumber(parsed.amount)} UZS`,
    };

    await sendMessage(chatId, successMsgs[lang] || successMsgs.en);
  } catch (error) {
    console.error('Voice processing error:', error);
    const errorMsgs: Record<string, string> = {
      uz: `❌ Ovozli xabarni qayta ishlashda xatolik. Iltimos, matn yozing.`,
      ru: `❌ Ошибка обработки голосового сообщения. Пожалуйста, напишите текстом.`,
      en: `❌ Error processing voice message. Please type your message.`,
    };
    await sendMessage(chatId, errorMsgs[lang] || errorMsgs.en);
  }
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

    // Handle callback queries (inline button presses)
    const callbackQuery = update.callback_query;
    if (callbackQuery) {
      const chatId = callbackQuery.message?.chat?.id;
      const userId = callbackQuery.from?.id;
      const lang = callbackQuery.from?.language_code || 'uz';
      const data = callbackQuery.data;

      console.log(`Callback query: ${data} from user ${userId}`);

      // Answer the callback to remove loading state
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackQuery.id }),
      });

      // Handle period selection
      if (data?.startsWith('period_')) {
        const period = data.replace('period_', '') as 'today' | 'week' | 'month';
        await handleDailySummary(chatId, userId, lang, period);
      }

      return new Response('OK', { status: 200 });
    }

    const message = update.message;
    if (!message) {
      return new Response('OK', { status: 200 });
    }

    const chatId = message.chat.id;
    const user = message.from;
    const text = message.text;
    const voice = message.voice;
    const lang = user?.language_code || 'uz';

    // Handle voice messages
    if (voice) {
      await handleVoiceMessage(chatId, voice, user);
      return new Response('OK', { status: 200 });
    }

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
        case '/stats':
          await handleStats(chatId, user?.id, lang);
          break;
        case '/daily':
          await handleDailySummary(chatId, user?.id, lang);
          break;
        case '/add':
          const addText = text.replace('/add ', '').trim();
          if (addText && addText !== '/add') {
            await handleTextMessage(chatId, addText, user);
          } else {
            const promptMsgs: Record<string, string> = {
              uz: '📝 Yozing: <code>/add taxi 20000</code>',
              ru: '📝 Напишите: <code>/add такси 20000</code>',
              en: '📝 Type: <code>/add taxi 20000</code>',
            };
            await sendMessage(chatId, promptMsgs[lang] || promptMsgs.en);
          }
          break;
        default:
          await handleHelp(chatId, lang);
      }
    } else if (text) {
      // Handle regular text
      await handleTextMessage(chatId, text, user);
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Internal error', { status: 500 });
  }
});
