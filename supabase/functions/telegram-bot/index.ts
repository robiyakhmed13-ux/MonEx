import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
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
    console.error('OPENAI_API_KEY not set for Whisper transcription');
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
    console.error('OPENAI_API_KEY not set for parsing');
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

// Check if current time is between 22:00-06:00 (night mode)
// Uses UTC time - ideally should use user's timezone
const isNightTime = (): boolean => {
  const now = new Date();
  const hour = now.getUTCHours();
  // Night time: 22:00 (22) to 06:00 (6) next day
  return hour >= 22 || hour < 6;
};

// Remove emojis from text
const removeEmojis = (text: string): string => {
  // Remove common emoji patterns
  return text
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Emoticons & Symbols
    .replace(/[\u{2600}-\u{26FF}]/gu, '') // Miscellaneous Symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '') // Dingbats
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport & Map
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Flags
    .trim();
};

// Format balance message in night mode (calm, minimal, no emojis, no numbers unless necessary)
const formatNightBalanceMessage = (stats: any, lang: string): string => {
  const messages: Record<string, string> = {
    uz: `Hozir tinch.
Hammasi nazorat ostida.`,
    ru: `Сейчас тихо.
Всё под контролем.`,
    en: `It's quiet now.
Everything looks under control.`,
  };
  return messages[lang] || messages.en;
};

// Format warning message in night mode
const formatNightWarningMessage = (warningType: string, lang: string): string => {
  const messages: Record<string, string> = {
    uz: `Hozir tinch.
Eslatma: nazorat qiling.`,
    ru: `Сейчас тихо.
Напоминание: проверьте.`,
    en: `It's quiet now.
Reminder: check when you can.`,
  };
  return messages[lang] || messages.en;
};

// Send warning message with night mode support
// This function can be used when implementing limit warnings or other alerts
const sendWarningMessage = async (chatId: number, warningType: string, lang: string, normalMessage: string) => {
  if (isNightTime()) {
    const nightMessage = formatNightWarningMessage(warningType, lang);
    await sendMessage(chatId, nightMessage);
  } else {
    await sendMessage(chatId, normalMessage);
  }
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
    uz: `Salom, ${firstName}.

Men sizning pulingiz bilan bog'liq tinchlikni his qilishingizga yordam berish uchun shu yerdaman.

MonEX sizning xarajatlaringiz va daromadlaringizni kuzatib boradi, shuning uchun sizga kerak emas.

Quyidagi tugmalardan foydalaning.`,

    ru: `Привет, ${firstName}.

Я здесь, чтобы помочь вам чувствовать себя спокойно с вашими деньгами.

MonEX отслеживает ваши расходы и доходы, чтобы вам не пришлось.

Используйте кнопки ниже, чтобы начать.`,

    en: `Hello, ${firstName}.

I'm here to help you feel calm about your money.

MonEX keeps track of your spending and income, so you don't have to.

Use the buttons below to get started.`,
  };

  const keyboardByLang: Record<string, any> = {
    uz: {
      keyboard: [
        [{ text: '➕ Xarajat' }, { text: '💰 Daromad' }],
        [{ text: '📊 Bugun' }, { text: '💵 Mening pulim' }],
        [{ text: '🎯 Maqsadlar' }, { text: '⚙️ Xarajatlar' }],
        [{ text: '🔗 Ulash' }],
      ],
      resize_keyboard: true,
      persistent: true,
    },
    ru: {
      keyboard: [
        [{ text: '➕ Расход' }, { text: '💰 Доход' }],
        [{ text: '📊 Сегодня' }, { text: '💵 Мои деньги' }],
        [{ text: '🎯 Цели' }, { text: '⚙️ Траты' }],
        [{ text: '🔗 Подключить' }],
      ],
      resize_keyboard: true,
      persistent: true,
    },
    en: {
      keyboard: [
        [{ text: '➕ Expense' }, { text: '💰 Income' }],
        [{ text: '📊 Today' }, { text: '💵 My Money' }],
        [{ text: '🎯 Goals' }, { text: '⚙️ Spending' }],
        [{ text: '🔗 Connect' }],
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

<b>Funksiyalar:</b>
📊 Statistika tugmasi - Bugungi statistika`,

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

<b>Функции:</b>
📊 Кнопка Статистика - Статистика за сегодня`,

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

<b>Features:</b>
📊 Stats button - Check today's statistics`,
  };

  await sendMessage(chatId, messages[lang] || messages.en);
};

// Generate meaningful daily stats insights
const generateDailyInsights = async (telegramUserId: number, lang: string) => {
  const stats = await getUserStats(telegramUserId);
  const todayBreakdown = await getExpenseBreakdown(telegramUserId, 'today');
  const weekBreakdown = await getExpenseBreakdown(telegramUserId, 'week');
  
  // Calculate average daily spending for the week
  const daysInWeek = 7;
  const avgDailyExpense = weekBreakdown.totalExpense / daysInWeek;
  
  // Find top category for today
  const topCategory = todayBreakdown.top[0];
  
  // Determine insight based on spending patterns
  if (stats.todayExpense === 0 && stats.todayIncome === 0) {
    // No activity today
    const messages: Record<string, { line1: string; line2: string }> = {
      uz: { 
        line1: "Bugun xarajat yo'q.",
        line2: "Hammasi nazorat ostida."
      },
      ru: { 
        line1: "Сегодня расходов нет.",
        line2: "Всё под контролем."
      },
      en: { 
        line1: "No spending today.",
        line2: "Everything looks calm."
      },
    };
    const msg = messages[lang] || messages.en;
    return { line1: msg.line1, line2: msg.line2, showButton: false };
  }
  
  // Compare today's spending with weekly average
  const spendingRatio = avgDailyExpense > 0 ? stats.todayExpense / avgDailyExpense : 0;
  
  if (spendingRatio < 0.5) {
    // Spending is much lower than average
    const messages: Record<string, { line1: string; line2: string }> = {
      uz: { 
        line1: "Bugun xarajat odatdagidan past.",
        line2: "Yaxshi ish qildingiz."
      },
      ru: { 
        line1: "Сегодня расходы ниже обычного.",
        line2: "Хорошая работа."
      },
      en: { 
        line1: "Spending stayed calm today.",
        line2: "You're doing great."
      },
    };
    const msg = messages[lang] || messages.en;
    return { line1: msg.line1, line2: msg.line2, showButton: false };
  } else if (spendingRatio > 1.5) {
    // Spending is higher than average
    const categoryName = topCategory ? getCategoryName(topCategory.categoryId, lang) : '';
    const messages: Record<string, { line1: string; line2: string; button: string }> = {
      uz: { 
        line1: "Bugun xarajat odatdagidan yuqori.",
        line2: topCategory ? `${categoryName} ko'proq sarflandi.` : "Xarajatlar ko'paydi.",
        button: "Tafsilotlarni ko'rsatishni xohlaysizmi?"
      },
      ru: { 
        line1: "Сегодня расходы выше обычного.",
        line2: topCategory ? `${categoryName} потрачено больше.` : "Расходы увеличились.",
        button: "Показать детали?"
      },
      en: { 
        line1: "Spending was higher than usual today.",
        line2: topCategory ? `${categoryName} was higher than usual.` : "Expenses increased.",
        button: "Want me to show details?"
      },
    };
    const msg = messages[lang] || messages.en;
    return { line1: msg.line1, line2: msg.line2, showButton: true, buttonText: msg.button };
  } else if (topCategory && topCategory.spent > 0) {
    // Normal spending, but highlight top category if it's notable
    // Check if this category is significantly higher than other categories
    const categoryName = getCategoryName(topCategory.categoryId, lang);
    const secondCategory = todayBreakdown.top[1];
    const isCategoryNotable = !secondCategory || topCategory.spent > secondCategory.spent * 1.5;
    
    if (isCategoryNotable) {
      const messages: Record<string, { line1: string; line2: string; button: string }> = {
        uz: { 
          line1: "Bugun xarajatlar odatdagidek.",
          line2: `${categoryName} ko'proq sarflandi.`,
          button: "Kuzatib borishni xohlaysizmi?"
        },
        ru: { 
          line1: "Сегодня расходы как обычно.",
          line2: `${categoryName} потрачено больше.`,
          button: "Хотите, чтобы я следил?"
        },
        en: { 
          line1: "Spending stayed calm today.",
          line2: `${categoryName} was higher than usual.`,
          button: "Want me to keep an eye on it?"
        },
      };
      const msg = messages[lang] || messages.en;
      return { line1: msg.line1, line2: msg.line2, showButton: true, buttonText: msg.button };
    }
  }
  
  // Default calm message (fallback for normal spending without notable categories)
  {
    const messages: Record<string, { line1: string; line2: string }> = {
      uz: { 
        line1: "Bugun xarajatlar nazorat ostida.",
        line2: "Hammasi yaxshi."
      },
      ru: { 
        line1: "Сегодня расходы под контролем.",
        line2: "Всё хорошо."
      },
      en: { 
        line1: "Spending stayed calm today.",
        line2: "Everything looks good."
      },
    };
    const msg = messages[lang] || messages.en;
    return { line1: msg.line1, line2: msg.line2, showButton: false };
  }
};

// Handle /stats command
const handleStats = async (chatId: number, telegramUserId: number, lang: string) => {
  const stats = await getUserStats(telegramUserId);
  
  // Use night mode if it's between 22:00-06:00
  if (isNightTime()) {
    const nightMessage = formatNightBalanceMessage(stats, lang);
    await sendMessage(chatId, nightMessage);
    return;
  }
  
  // Generate insights
  const insights = await generateDailyInsights(telegramUserId, lang);
  
  // Build message (max 3 lines)
  let message = insights.line1;
  if (insights.line2) {
    message += `\n${insights.line2}`;
  }
  
  // Add optional suggestion button
  let replyMarkup: any = undefined;
  if (insights.showButton && insights.buttonText) {
    replyMarkup = {
      inline_keyboard: [[
        { 
          text: insights.buttonText, 
          callback_data: 'stats_details' 
        }
      ]]
    };
  }
  
  await sendMessage(chatId, message, replyMarkup ? { reply_markup: replyMarkup } : undefined);
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
    uz: `Here's how ${periodLabels[period][lang].toLowerCase()} looks.\n\n📤 Jami: ${formatNumber(daily.totalExpense)} ${daily.currency}\n📥 Daromad: ${formatNumber(daily.totalIncome)} ${daily.currency}`,
    ru: `Here's how ${periodLabels[period][lang].toLowerCase()} looks.\n\n📤 Итого: ${formatNumber(daily.totalExpense)} ${daily.currency}\n📥 Доход: ${formatNumber(daily.totalIncome)} ${daily.currency}`,
    en: `Here's how ${periodLabels[period][lang].toLowerCase()} looks.\n\n📤 Total: ${formatNumber(daily.totalExpense)} ${daily.currency}\n📥 Income: ${formatNumber(daily.totalIncome)} ${daily.currency}`,
  };

  if (!daily.top.length) {
    const empty: Record<string, string> = {
      uz: header[lang] + `\n\nXarajat yo'q`,
      ru: header[lang] + `\n\nРасходов нет`,
      en: header[lang] + `\n\nNo expenses`,
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

// Handle /limit command - Show limits with inline management
const handleLimit = async (chatId: number, telegramUserId: number, lang: string) => {
  const categoryLimits: Record<string, number> = {
    food: 500000,
    restaurants: 300000,
    taxi: 200000,
    shopping: 400000,
    entertainment: 200000,
  };

  const messages: Record<string, string> = {
    uz: `Joriy limitlar:`,
    ru: `Текущие лимиты:`,
    en: `Current limits:`,
  };

  let limitsText = '';
  for (const [cat, limit] of Object.entries(categoryLimits)) {
    const emoji = CATEGORY_EMOJIS[cat] || '📦';
    const name = getCategoryName(cat, lang);
    limitsText += `\n${emoji} ${name}: ${formatNumber(limit)} UZS`;
  }

  const footer: Record<string, string> = {
    uz: `\n\nLimit o'rnatish uchun quyidagi tugmalardan birini bosing`,
    ru: `\n\nНажмите на одну из кнопок ниже, чтобы установить лимит`,
    en: `\n\nTap a button below to set a limit`,
  };

  const keyboard = {
    inline_keyboard: [
      [
        { text: lang === 'uz' ? '🍔 Oziq-ovqat' : lang === 'ru' ? '🍔 Еда' : '🍔 Food', callback_data: 'limit_food' },
        { text: lang === 'uz' ? '🚕 Taksi' : lang === 'ru' ? '🚕 Такси' : '🚕 Taxi', callback_data: 'limit_taxi' },
      ],
      [
        { text: lang === 'uz' ? '🛍️ Xaridlar' : lang === 'ru' ? '🛍️ Покупки' : '🛍️ Shopping', callback_data: 'limit_shopping' },
        { text: lang === 'uz' ? '🎬 Ko\'ngil' : lang === 'ru' ? '🎬 Развлечения' : '🎬 Fun', callback_data: 'limit_entertainment' },
      ],
    ]
  };

  await sendMessage(chatId, (messages[lang] || messages.en) + limitsText + (footer[lang] || footer.en), { reply_markup: keyboard });
};

// Handle /goal command - Show goals with progress
const handleGoal = async (chatId: number, telegramUserId: number, lang: string) => {
  const sampleGoals = [
    { name: lang === 'ru' ? 'Машина' : lang === 'uz' ? 'Mashina' : 'Car', target: 50000000, current: 15000000, emoji: '🚗' },
    { name: lang === 'ru' ? 'Отпуск' : lang === 'uz' ? 'Dam olish' : 'Vacation', target: 10000000, current: 4500000, emoji: '✈️' },
  ];

  const messages: Record<string, string> = {
    uz: `Maqsadlar:\n`,
    ru: `Цели:\n`,
    en: `Goals:\n`,
  };

  let goalsText = '';
  for (const goal of sampleGoals) {
    const pct = Math.round((goal.current / goal.target) * 100);
    const progressBar = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));
    goalsText += `\n${goal.emoji} <b>${goal.name}</b>
${progressBar} ${pct}%
${formatNumber(goal.current)} / ${formatNumber(goal.target)} UZS\n`;
  }

  const footer: Record<string, string> = {
    uz: `\nYangi maqsad qo'shish uchun quyidagi tugmani bosing`,
    ru: `\nНажмите кнопку ниже, чтобы добавить новую цель`,
    en: `\nTap the button below to set a new goal`,
  };

  const keyboard = {
    inline_keyboard: [
      [
        { text: lang === 'uz' ? '➕ Yangi maqsad' : lang === 'ru' ? '➕ Новая цель' : '➕ New Goal', callback_data: 'goal_new' },
      ],
      [
        { text: lang === 'uz' ? '💰 Qo\'shish' : lang === 'ru' ? '💰 Пополнить' : '💰 Add funds', callback_data: 'goal_deposit' },
      ],
    ]
  };

  await sendMessage(chatId, (messages[lang] || messages.en) + goalsText + (footer[lang] || footer.en), { reply_markup: keyboard });
};

// Handle /remind command - Set reminders
const handleRemind = async (chatId: number, telegramUserId: number, lang: string) => {
  const messages: Record<string, string> = {
    uz: `Faol eslatmalar:
• 📅 Har kuni 21:00 - Kunlik hisobot
• 💡 Limit oshsa - Ogohlantirish

Eslatma qo'shish uchun quyidagi tugmalardan foydalaning`,
    ru: `Активные напоминания:
• 📅 Каждый день 21:00 - Дневной отчёт
• 💡 Превышение лимита - Предупреждение

Используйте кнопки ниже, чтобы добавить напоминание`,
    en: `Active reminders:
• 📅 Daily at 21:00 - Daily report
• 💡 Limit exceeded - Warning

Use the buttons below to add a reminder`,
  };

  const keyboard = {
    inline_keyboard: [
      [
        { text: lang === 'uz' ? '📅 Kunlik 21:00' : lang === 'ru' ? '📅 Ежедневно 21:00' : '📅 Daily 21:00', callback_data: 'remind_daily_21' },
      ],
      [
        { text: lang === 'uz' ? '📊 Haftalik' : lang === 'ru' ? '📊 Еженедельно' : '📊 Weekly', callback_data: 'remind_weekly' },
        { text: lang === 'uz' ? '🗓 Oylik' : lang === 'ru' ? '🗓 Ежемесячно' : '🗓 Monthly', callback_data: 'remind_monthly' },
      ],
    ]
  };

  await sendMessage(chatId, messages[lang] || messages.en, { reply_markup: keyboard });
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

  if (text === '📊 Bugun' || text === '📊 Сегодня' || text === '📊 Today') {
    await handleStats(chatId, telegramUserId, lang);
    return;
  }

  if (text === '💵 Mening pulim' || text === '💵 Мои деньги' || text === '💵 My Money') {
    // Handle balance view - for now redirect to stats
    await handleStats(chatId, telegramUserId, lang);
    return;
  }

  if (text === '🔗 Ulash' || text === '🔗 Подключить' || text === '🔗 Connect') {
    // Handle account linking
    const linkMsgs: Record<string, string> = {
      uz: '🔗 Hisobingizni ulash uchun quyidagi havolani bosing...',
      ru: '🔗 Нажмите на ссылку ниже, чтобы подключить ваш аккаунт...',
      en: '🔗 Tap the link below to connect your account...',
    };
    await sendMessage(chatId, linkMsgs[lang] || linkMsgs.en);
    return;
  }

  // Handle goals button
  if (text === '🎯 Maqsadlar' || text === '🎯 Цели' || text === '🎯 Goals') {
    await handleGoal(chatId, telegramUserId, lang);
    return;
  }

  // Handle limits button
  if (text === '⚙️ Xarajatlar' || text === '⚙️ Траты' || text === '⚙️ Spending') {
    await handleLimit(chatId, telegramUserId, lang);
    return;
  }

  // Try to parse as transaction
  const parsed = await parseTransaction(text, lang);
  
  if (!parsed || parsed.error) {
      const errorMsgs: Record<string, string> = {
        uz: `Tushunmadim. Masalan: <code>taxi 20000</code>\n\nYoki ovozli xabar 🎤`,
        ru: `Не понял. Например: <code>такси 20000</code>\n\nИли голосовое 🎤`,
        en: `Couldn't understand. Try: <code>taxi 20000</code>\n\nOr voice 🎤`,
      };
    await sendMessage(chatId, errorMsgs[lang] || errorMsgs.en);
    return;
  }

  // Save to database
  const saved = await saveTransaction(telegramUserId, parsed);
  if (!saved) {
    const errorMsgs: Record<string, string> = {
      uz: `Xatolik yuz berdi. Qaytadan urinib ko'ring.`,
      ru: `Произошла ошибка. Попробуйте ещё раз.`,
      en: `An error occurred. Please try again.`,
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
    uz: `Got it.

${typeEmoji} ${typeLabel[parsed.type][lang]}
${emoji} ${catName}
💵 ${formatNumber(parsed.amount)} so'm`,

    ru: `Got it.

${typeEmoji} ${typeLabel[parsed.type][lang]}
${emoji} ${catName}
💵 ${formatNumber(parsed.amount)} сум`,

    en: `Got it.

${typeEmoji} ${typeLabel[parsed.type][lang]}
${emoji} ${catName}
💵 ${formatNumber(parsed.amount)} UZS`,
  };

  await sendMessage(chatId, confirmMsgs[lang] || confirmMsgs.en);
};

// Extract receipt data from photo using OpenAI Vision
const extractReceiptData = async (imageBuffer: ArrayBuffer): Promise<any> => {
  if (!OPENAI_API_KEY) {
    return null;
  }

  try {
    // Convert to base64
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract receipt data. Return ONLY valid JSON (no markdown):
{
  "description": "store or item name",
  "amount": number,
  "currency": "UZS"
}`
              },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${base64Image}` }
              }
            ]
          }
        ],
        max_tokens: 200
      })
    });

    if (!response.ok) {
      console.error('OpenAI Vision API error:', await response.text());
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    if (!content) return null;

    // Extract JSON from response
    const cleaned = content.replace(/```json|```/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) return null;
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Receipt extraction error:', error);
    return null;
  }
};

// Handle photo message
const handlePhotoMessage = async (chatId: number, photo: any[], user: any) => {
  const lang = user?.language_code || 'uz';
  const telegramUserId = user?.id;
  
  // Step 1: Immediate response
  const initialMsgs: Record<string, string> = {
    uz: 'Give me a second.',
    ru: 'Give me a second.',
    en: 'Give me a second.',
  };
  await sendMessage(chatId, initialMsgs[lang] || initialMsgs.en);

  try {
    // Get the largest photo
    const largestPhoto = photo[photo.length - 1];
    
    // Get file path
    const filePath = await getFile(largestPhoto.file_id);
    if (!filePath) {
      throw new Error('Could not get file path');
    }

    // Download image
    const imageBuffer = await downloadFile(filePath);
    
    // Extract receipt data
    const receiptData = await extractReceiptData(imageBuffer);
    
    if (!receiptData || !receiptData.amount) {
      // Recognition failed - apologize and ask for manual input
      const errorMsgs: Record<string, string> = {
        uz: 'Kechirasiz, chekni o\'qiy olmadim. Summani qo\'lda kiriting.',
        ru: 'Извините, не смог прочитать чек. Введите сумму вручную.',
        en: 'Sorry, couldn\'t read the receipt. Please type the amount manually.',
      };
      await sendMessage(chatId, errorMsgs[lang] || errorMsgs.en);
      return;
    }

    // Parse as transaction
    const description = receiptData.description || 'Shopping';
    const amount = receiptData.amount;
    
    // Try to parse description to get category
    const parsed = await parseTransaction(`${description} ${amount}`, lang);
    
    if (!parsed || parsed.error) {
      // Use default shopping category
      const defaultParsed = {
        type: 'expense',
        categoryId: 'shopping',
        amount: amount,
        description: description,
      };
      
      const saved = await saveTransaction(telegramUserId, defaultParsed);
      if (!saved) {
        throw new Error('Failed to save transaction');
      }

      // Confirmation message
      const emoji = CATEGORY_EMOJIS['shopping'] || '🛍️';
      const catName = getCategoryName('shopping', lang);
      const confirmMsgs: Record<string, string> = {
        uz: `${catName}\n💵 ${formatNumber(amount)} so'm\n\nQo'shildi.`,
        ru: `${catName}\n💵 ${formatNumber(amount)} сум\n\nДобавлено.`,
        en: `${catName}\n💵 ${formatNumber(amount)} UZS\n\nAdded.`,
      };
      await sendMessage(chatId, confirmMsgs[lang] || confirmMsgs.en);
      return;
    }

    // Save to database
    const saved = await saveTransaction(telegramUserId, parsed);
    if (!saved) {
      throw new Error('Failed to save transaction');
    }

    // Confirmation message
    const emoji = CATEGORY_EMOJIS[parsed.categoryId] || '📝';
    const catName = getCategoryName(parsed.categoryId, lang);
    const confirmMsgs: Record<string, string> = {
      uz: `${catName}\n💵 ${formatNumber(parsed.amount)} so'm\n\nQo'shildi.`,
      ru: `${catName}\n💵 ${formatNumber(parsed.amount)} сум\n\nДобавлено.`,
      en: `${catName}\n💵 ${formatNumber(parsed.amount)} UZS\n\nAdded.`,
    };
    await sendMessage(chatId, confirmMsgs[lang] || confirmMsgs.en);
  } catch (error) {
    console.error('Photo processing error:', error);
    // Apologize and ask for manual input
    const errorMsgs: Record<string, string> = {
      uz: 'Kechirasiz, chekni o\'qiy olmadim. Summani qo\'lda kiriting.',
      ru: 'Извините, не смог прочитать чек. Введите сумму вручную.',
      en: 'Sorry, couldn\'t read the receipt. Please type the amount manually.',
    };
    await sendMessage(chatId, errorMsgs[lang] || errorMsgs.en);
  }
};

// Handle voice message
const handleVoiceMessage = async (chatId: number, voice: any, user: any) => {
  const lang = user?.language_code || 'uz';
  const telegramUserId = user?.id;
  
  // Send processing message
  const processingMsgs: Record<string, string> = {
    uz: '🎤 Qayta ishlayman...',
    ru: '🎤 Обрабатываю...',
    en: '🎤 Processing...',
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
        uz: `🎤 Eshitdim: "<i>${transcription}</i>"\n\nTranzaksiya tushunilmadi. Masalan: "Taksi yigirma ming"`,
        ru: `🎤 Услышал: "<i>${transcription}</i>"\n\nНе удалось понять транзакцию. Например: "Такси двадцать тысяч"`,
        en: `🎤 Heard: "<i>${transcription}</i>"\n\nCouldn't understand transaction. Try: "Taxi twenty thousand"`,
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

Noted.
${typeEmoji} ${catName} ${emoji}
💵 ${formatNumber(parsed.amount)} so'm`,

      ru: `🎤 "<i>${transcription}</i>"

Noted.
${typeEmoji} ${catName} ${emoji}
💵 ${formatNumber(parsed.amount)} сум`,

      en: `🎤 "<i>${transcription}</i>"

Noted.
${typeEmoji} ${catName} ${emoji}
💵 ${formatNumber(parsed.amount)} UZS`,
    };

    await sendMessage(chatId, successMsgs[lang] || successMsgs.en);
  } catch (error) {
    console.error('Voice processing error:', error);
    const errorMsgs: Record<string, string> = {
      uz: `Ovozli xabarni qayta ishlashda xatolik. Matn yozing.`,
      ru: `Ошибка обработки голосового сообщения. Напишите текстом.`,
      en: `Error processing voice message. Please type your message.`,
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

      // Handle stats details callback
      if (data === 'stats_details') {
        await handleDailySummary(chatId, userId, lang, 'today');
      }

      // Handle limit callbacks
      if (data?.startsWith('limit_')) {
        const category = data.replace('limit_', '');
        const confirmMsgs: Record<string, string> = {
          uz: `${getCategoryName(category, lang)} limiti.\n\nLimit o'rnatish uchun summa yozing. Masalan: <code>300000</code>`,
          ru: `Лимит ${getCategoryName(category, lang)}.\n\nНапишите сумму для установки лимита. Например: <code>300000</code>`,
          en: `${getCategoryName(category, lang)} limit.\n\nType the amount to set the limit. Example: <code>300000</code>`,
        };
        await sendMessage(chatId, confirmMsgs[lang] || confirmMsgs.en);
      }

      // Handle goal callbacks
      if (data?.startsWith('goal_')) {
        const action = data.replace('goal_', '');
        if (action === 'new') {
          const msgs: Record<string, string> = {
            uz: `Yangi maqsad yaratish uchun maqsad nomi va summasini yozing.\n\nMisol: <code>Mashina 50000000</code>`,
            ru: `Напишите название цели и сумму для создания новой цели.\n\nПример: <code>Машина 50000000</code>`,
            en: `Type the goal name and amount to create a new goal.\n\nExample: <code>Car 50000000</code>`,
          };
          await sendMessage(chatId, msgs[lang] || msgs.en);
        } else if (action === 'deposit') {
          const msgs: Record<string, string> = {
            uz: `Maqsadga qo'shish uchun maqsad nomi va summasini yozing.\n\nMisol: <code>Mashina 500000</code>`,
            ru: `Напишите название цели и сумму для пополнения.\n\nПример: <code>Машина 500000</code>`,
            en: `Type the goal name and amount to add funds.\n\nExample: <code>Car 500000</code>`,
          };
          await sendMessage(chatId, msgs[lang] || msgs.en);
        }
      }

      // Handle remind callbacks
      if (data?.startsWith('remind_')) {
        const type = data.replace('remind_', '');
        const msgs: Record<string, string> = {
          uz: `Noted. ${type === 'daily_21' ? 'Har kuni 21:00' : type === 'weekly' ? 'Har hafta' : 'Har oy'}`,
          ru: `Noted. ${type === 'daily_21' ? 'Каждый день 21:00' : type === 'weekly' ? 'Каждую неделю' : 'Каждый месяц'}`,
          en: `Noted. ${type === 'daily_21' ? 'Daily at 21:00' : type === 'weekly' ? 'Weekly' : 'Monthly'}`,
        };
        await sendMessage(chatId, msgs[lang] || msgs.en);
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
    const photo = message.photo;
    const lang = user?.language_code || 'uz';

    // Handle photo messages
    if (photo && photo.length > 0) {
      await handlePhotoMessage(chatId, photo, user);
      return new Response('OK', { status: 200 });
    }

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
              uz: '📝 Xarajat yoki daromad qo\'shish uchun summa va kategoriyani yozing.\n\nMisol: <code>taxi 20000</code> yoki ovozli xabar yuboring 🎤',
              ru: '📝 Напишите сумму и категорию для добавления расхода или дохода.\n\nПример: <code>такси 20000</code> или отправьте голосовое сообщение 🎤',
              en: '📝 Type the amount and category to add an expense or income.\n\nExample: <code>taxi 20000</code> or send a voice message 🎤',
            };
            await sendMessage(chatId, promptMsgs[lang] || promptMsgs.en);
          }
          break;
        case '/limit':
          await handleLimit(chatId, user?.id, lang);
          break;
        case '/goal':
          await handleGoal(chatId, user?.id, lang);
          break;
        case '/remind':
          await handleRemind(chatId, user?.id, lang);
          break;
        default:
          const unknownCommandMsgs: Record<string, string> = {
            uz: `Tushunmadim. Quyidagi tugmalardan foydalaning.`,
            ru: `Не понял. Используйте кнопки ниже.`,
            en: `Not sure what you meant. Try tapping a button below.`,
          };
          await sendMessage(chatId, unknownCommandMsgs[lang] || unknownCommandMsgs.en);
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
