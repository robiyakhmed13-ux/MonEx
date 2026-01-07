// Supabase Edge Function: telegram-daily-summary
// Scheduled daily summary at 21:00 local time with timezone support
// Runs hourly via cron, finds users whose local time is 21:00

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

type Lang = 'uz' | 'ru' | 'en';

// Multi-language translations
const i18n = {
  uz: {
    title: "📊 Kunlik hisobot",
    spentToday: "Bugun sarflandi",
    topCategory: "Eng ko'p sarflangan kategoriya",
    insight: "Kuzatuv",
    suggestedAction: "Tavsiya",
    viewActivity: "Faollikni ko'rish",
    setLimit: "Limit o'rnatish",
    noExpenses: "Bugun xarajatlar yo'q 💤",
    transactions: "tranzaksiya",
    keepTracking: "💡 Xarajatlarni kuzatishda davom eting!",
    vsYesterday: "Kechaga nisbatan",
    more: "ko'p",
    less: "kam",
    same: "bir xil",
    topSpending: "Eng ko'p sarflangan",
    category: "kategoriya",
    avgDaily: "O'rtacha kunlik",
    thisMonth: "Bu oy",
    onTrack: "Maqsadga erishish yo'lidasiz!",
    overBudget: "Byudjetdan oshib ketdingiz",
    nearLimit: "Limitga yaqinlashdingiz",
    goodJob: "Ajoyib! Xarajatlarni nazorat qilyapsiz.",
  },
  ru: {
    title: "📊 Дневная сводка",
    spentToday: "Потрачено сегодня",
    topCategory: "Топ категория",
    insight: "Инсайт",
    suggestedAction: "Рекомендация",
    viewActivity: "Просмотр активности",
    setLimit: "Установить лимит",
    noExpenses: "Сегодня расходов нет 💤",
    transactions: "транзакций",
    keepTracking: "💡 Продолжайте отслеживать расходы!",
    vsYesterday: "По сравнению со вчера",
    more: "больше",
    less: "меньше",
    same: "так же",
    topSpending: "Больше всего потрачено",
    category: "категория",
    avgDaily: "Среднедневной",
    thisMonth: "Этот месяц",
    onTrack: "Вы на пути к цели!",
    overBudget: "Вы превысили бюджет",
    nearLimit: "Вы близки к лимиту",
    goodJob: "Отлично! Вы контролируете расходы.",
  },
  en: {
    title: "📊 Daily Summary",
    spentToday: "Spent today",
    topCategory: "Top category",
    insight: "Insight",
    suggestedAction: "Suggestion",
    viewActivity: "View Activity",
    setLimit: "Set Limit",
    noExpenses: "No expenses today 💤",
    transactions: "transactions",
    keepTracking: "💡 Keep tracking your spending!",
    vsYesterday: "vs yesterday",
    more: "more",
    less: "less",
    same: "same",
    topSpending: "Top spending",
    category: "category",
    avgDaily: "Average daily",
    thisMonth: "This month",
    onTrack: "You're on track!",
    overBudget: "You're over budget",
    nearLimit: "You're near your limit",
    goodJob: "Great job! You're controlling your spending.",
  },
};

// Category translations
const categoryNames: Record<string, Record<Lang, string>> = {
  taxi: { uz: "Taksi", ru: "Такси", en: "Taxi" },
  food: { uz: "Oziq-ovqat", ru: "Продукты", en: "Food" },
  restaurants: { uz: "Restoranlar", ru: "Рестораны", en: "Restaurants" },
  coffee: { uz: "Kofe", ru: "Кофе", en: "Coffee" },
  shopping: { uz: "Xaridlar", ru: "Покупки", en: "Shopping" },
  transport: { uz: "Transport", ru: "Транспорт", en: "Transport" },
  entertainment: { uz: "Ko'ngilochar", ru: "Развлечения", en: "Entertainment" },
  health: { uz: "Salomatlik", ru: "Здоровье", en: "Health" },
  bills: { uz: "Kommunal", ru: "Коммунальные", en: "Bills" },
  fuel: { uz: "Benzin", ru: "Бензин", en: "Fuel" },
  education: { uz: "Ta'lim", ru: "Образование", en: "Education" },
  other: { uz: "Boshqa", ru: "Другое", en: "Other" },
};

const categoryEmojis: Record<string, string> = {
  taxi: '🚕', food: '🍔', restaurants: '🍽️', coffee: '☕',
  shopping: '🛍️', transport: '🚗', entertainment: '🎬', health: '💊',
  bills: '💡', fuel: '⛽', education: '📚', other: '📦',
};

function t(lang: Lang) {
  return i18n[lang] || i18n.en;
}

function getCatName(categoryId: string, lang: Lang): string {
  return categoryNames[categoryId]?.[lang] || categoryId;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(Math.abs(amount)));
}

async function sendTelegramMessage(
  chatId: number,
  text: string,
  inlineKeyboard?: any
) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN not configured');
    return false;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: inlineKeyboard ? { inline_keyboard: inlineKeyboard } : undefined,
      }),
    });

    const result = await response.json();
    if (!result.ok) {
      console.error('Telegram API error:', result);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
    return false;
  }
}

// Get today's date in user's timezone
function getTodayInTimezone(timezone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(now);
  } catch {
    // Fallback to UTC if timezone is invalid
    return new Date().toISOString().slice(0, 10);
  }
}

// Generate insight based on spending patterns
function generateInsight(
  todaySpent: number,
  yesterdaySpent: number,
  topCategory: string | null,
  avgDaily: number,
  lang: Lang
): string {
  const tr = t(lang);
  
  if (todaySpent === 0) {
    return `${tr.noExpenses}`;
  }

  const diff = todaySpent - yesterdaySpent;
  const diffPercent = yesterdaySpent > 0 ? Math.abs((diff / yesterdaySpent) * 100) : 0;
  
  let insight = '';
  
  if (diff > 0 && diffPercent > 20) {
    insight = `${tr.vsYesterday} ${formatMoney(diff)} UZS ${tr.more} (${Math.round(diffPercent)}%)`;
  } else if (diff < 0 && diffPercent > 20) {
    insight = `${tr.vsYesterday} ${formatMoney(Math.abs(diff))} UZS ${tr.less} (${Math.round(diffPercent)}%)`;
  } else {
    insight = `${tr.vsYesterday} ${tr.same}`;
  }

  if (topCategory) {
    insight += `\n${tr.topSpending}: ${getCatName(topCategory, lang)}`;
  }

  if (todaySpent > avgDaily * 1.2) {
    insight += `\n⚠️ ${tr.overBudget}`;
  } else if (todaySpent < avgDaily * 0.8) {
    insight += `\n✅ ${tr.onTrack}`;
  }

  return insight;
}

// Generate suggested action
function generateSuggestedAction(
  topCategory: string | null,
  categorySpent: number,
  hasLimit: boolean,
  lang: Lang
): string {
  const tr = t(lang);
  
  if (!topCategory) {
    return tr.goodJob;
  }

  if (!hasLimit && categorySpent > 100000) {
    return `${tr.setLimit} ${getCatName(topCategory, lang)}`;
  }

  return tr.goodJob;
}

// Send daily summary to a single user
async function sendDailySummaryToUser(
  userId: string,
  telegramId: number,
  timezone: string,
  lang: Lang,
  supabase: any
): Promise<boolean> {
  try {
    const today = getTodayInTimezone(timezone);
    const tr = t(lang);

    // Get today's transactions
    const { data: todayTx, error: todayError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .eq('type', 'expense')
      .order('date', { ascending: false });

    if (todayError) {
      console.error('Error fetching today transactions:', todayError);
      return false;
    }

    // Get yesterday's transactions for comparison
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    
    const { data: yesterdayTx } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('date', yesterdayStr)
      .eq('type', 'expense');

    // Calculate today's spending
    const todaySpent = (todayTx || []).reduce((sum: number, tx: any) => sum + Math.abs(Number(tx.amount)), 0);
    const yesterdaySpent = (yesterdayTx || []).reduce((sum: number, tx: any) => sum + Math.abs(Number(tx.amount)), 0);

    // Get top category
    const categoryTotals: Record<string, number> = {};
    (todayTx || []).forEach((tx: any) => {
      const cat = tx.category_id || 'other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Math.abs(Number(tx.amount));
    });

    const topCategoryEntry = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])[0];
    
    const topCategory = topCategoryEntry ? topCategoryEntry[0] : null;
    const topCategorySpent = topCategoryEntry ? topCategoryEntry[1] : 0;

    // Calculate average daily spending this month
    const monthStart = new Date(today);
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().slice(0, 10);
    
    const { data: monthTx } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .gte('date', monthStartStr)
      .lte('date', today);

    const monthSpent = (monthTx || []).reduce((sum: number, tx: any) => sum + Math.abs(Number(tx.amount)), 0);
    const daysInMonth = new Date(today).getDate();
    const avgDaily = daysInMonth > 0 ? monthSpent / daysInMonth : 0;

    // Check if user has limit for top category
    let hasLimit = false;
    if (topCategory) {
      const { data: limits } = await supabase
        .from('limits')
        .select('*')
        .eq('user_id', userId)
        .eq('category_id', topCategory)
        .limit(1);
      hasLimit = (limits || []).length > 0;
    }

    // Generate insight and suggested action
    const insight = generateInsight(todaySpent, yesterdaySpent, topCategory, avgDaily, lang);
    const suggestedAction = generateSuggestedAction(topCategory, topCategorySpent, hasLimit, lang);

    // Build message
    let message = `<b>${tr.title}</b>\n\n`;
    
    if (todaySpent === 0) {
      message += `${tr.noExpenses}\n\n${tr.keepTracking}`;
    } else {
      message += `<b>💰 ${tr.spentToday}:</b> ${formatMoney(todaySpent)} UZS\n`;
      message += `<b>📋 ${tr.transactions}:</b> ${(todayTx || []).length}\n\n`;

      if (topCategory) {
        const emoji = categoryEmojis[topCategory] || '📌';
        message += `<b>${emoji} ${tr.topCategory}:</b> ${getCatName(topCategory, lang)}\n`;
        message += `<b>💵 ${tr.topSpending}:</b> ${formatMoney(topCategorySpent)} UZS\n\n`;
      }

      message += `<b>💡 ${tr.insight}:</b>\n${insight}\n\n`;
      message += `<b>🎯 ${tr.suggestedAction}:</b> ${suggestedAction}`;
    }

    // Create inline keyboard
    const inlineKeyboard = [
      [
        { text: tr.viewActivity, callback_data: 'cmd_stats' },
      ],
      [
        { text: tr.setLimit, callback_data: 'cmd_limits' },
      ],
    ];

    // Send message
    const sent = await sendTelegramMessage(telegramId, message, inlineKeyboard);
    return sent;
  } catch (error) {
    console.error(`Error sending summary to user ${userId}:`, error);
    return false;
  }
}

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Check if this is a cron trigger (no body) or manual API call
    const body = await req.text();
    let requestData: any = {};
    
    if (body) {
      try {
        requestData = JSON.parse(body);
      } catch {
        // Empty body means cron trigger
      }
    }

    // CRON MODE: Find users whose local time is 21:00
    if (!requestData.telegramUserId) {
      console.log('Running in cron mode - finding users at 21:00 local time...');

      // Use the database function to get eligible users
      const { data: users, error: usersError } = await supabase.rpc('get_users_for_daily_summary', {
        target_hour: 21,
      });

      if (usersError) {
        console.error('Error fetching users:', usersError);
        // Fallback: query directly
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, telegram_id, timezone, language')
          .not('telegram_id', 'is', null);

        if (!profiles || profiles.length === 0) {
          return new Response(JSON.stringify({ message: 'No users found', sent: 0 }), {
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Filter users whose local time is 21:00
        const eligibleUsers = profiles.filter((profile: any) => {
          try {
            const tz = profile.timezone || 'Asia/Tashkent';
            const now = new Date();
            const localTime = new Date(now.toLocaleString('en-US', { timeZone: tz }));
            return localTime.getHours() === 21;
          } catch {
            return false;
          }
        });

        if (eligibleUsers.length === 0) {
          return new Response(JSON.stringify({ message: 'No users at 21:00', sent: 0 }), {
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Send summaries to all eligible users
        let sentCount = 0;
        for (const user of eligibleUsers) {
          const lang = (user.language || 'uz') as Lang;
          const success = await sendDailySummaryToUser(
            user.id,
            user.telegram_id,
            user.timezone || 'Asia/Tashkent',
            lang,
            supabase
          );
          if (success) sentCount++;
        }

        return new Response(JSON.stringify({ 
          message: 'Cron job completed',
          usersFound: eligibleUsers.length,
          sent: sentCount 
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (!users || users.length === 0) {
        return new Response(JSON.stringify({ message: 'No users at 21:00', sent: 0 }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Send summaries to all eligible users
      let sentCount = 0;
      for (const user of users) {
        const lang = (user.language || 'uz') as Lang;
        const success = await sendDailySummaryToUser(
          user.user_id,
          user.telegram_id,
          user.timezone || 'Asia/Tashkent',
          lang,
          supabase
        );
        if (success) sentCount++;
      }

      return new Response(JSON.stringify({ 
        message: 'Cron job completed',
        usersFound: users.length,
        sent: sentCount 
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // MANUAL MODE: Send summary to specific user
    const { telegramUserId, timezone = 'Asia/Tashkent', lang = 'uz' } = requestData;

    // Get user profile
    const { data: telegramUser } = await supabase
      .from('telegram_users')
      .select('user_id, telegram_id')
      .eq('telegram_id', telegramUserId)
      .single();

    if (!telegramUser || !telegramUser.user_id) {
      return new Response(JSON.stringify({ 
        error: 'User not found or not linked',
        success: false 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get user profile for language
    const { data: profile } = await supabase
      .from('profiles')
      .select('language, timezone')
      .eq('id', telegramUser.user_id)
      .single();

    const userLang = (profile?.language || lang) as Lang;
    const userTimezone = profile?.timezone || timezone;

    const success = await sendDailySummaryToUser(
      telegramUser.user_id,
      telegramUserId,
      userTimezone,
      userLang,
      supabase
    );

    return new Response(JSON.stringify({ 
      success,
      telegramUserId 
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Daily summary error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
