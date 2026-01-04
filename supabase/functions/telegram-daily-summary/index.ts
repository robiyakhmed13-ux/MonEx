import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

interface DailySummaryRequest {
  telegramUserId: number;
  timezone?: string; // e.g., "Asia/Tashkent"
  lang?: 'uz' | 'ru' | 'en';
}

async function sendTelegramMessage(chatId: number, text: string, parseMode = 'HTML') {
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
        parse_mode: parseMode,
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

function formatNumber(num: number): string {
  return num.toLocaleString('ru-RU');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { telegramUserId, timezone = 'Asia/Tashkent', lang = 'ru' }: DailySummaryRequest = await req.json();

    if (!telegramUserId) {
      throw new Error('telegramUserId is required');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Get today's transactions from the database
    const today = new Date().toISOString().slice(0, 10);
    const { data: transactions, error } = await supabase
      .from('telegram_transactions')
      .select('*')
      .eq('telegram_user_id', telegramUserId)
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      throw new Error('Failed to fetch transactions');
    }

    // Calculate summary
    let totalExpenses = 0;
    let totalIncome = 0;
    const categoryTotals: Record<string, number> = {};

    (transactions || []).forEach(tx => {
      if (tx.type === 'expense') {
        totalExpenses += tx.amount;
        categoryTotals[tx.category_id] = (categoryTotals[tx.category_id] || 0) + tx.amount;
      } else {
        totalIncome += tx.amount;
      }
    });

    // Get top 3 expense categories
    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    // Build message based on language
    const labels = {
      title: lang === 'ru' ? '📊 Дневная сводка' : lang === 'uz' ? '📊 Kunlik hisobot' : '📊 Daily Summary',
      date: lang === 'ru' ? 'Дата' : lang === 'uz' ? 'Sana' : 'Date',
      expenses: lang === 'ru' ? 'Расходы' : lang === 'uz' ? 'Xarajatlar' : 'Expenses',
      income: lang === 'ru' ? 'Доход' : lang === 'uz' ? 'Daromad' : 'Income',
      balance: lang === 'ru' ? 'Баланс дня' : lang === 'uz' ? 'Kun balansi' : 'Day balance',
      topCategories: lang === 'ru' ? 'Топ расходы' : lang === 'uz' ? 'Top xarajatlar' : 'Top expenses',
      transactions: lang === 'ru' ? 'транзакций' : lang === 'uz' ? 'tranzaksiya' : 'transactions',
      noTransactions: lang === 'ru' ? 'Сегодня транзакций нет 💤' : lang === 'uz' ? 'Bugun tranzaksiyalar yo\'q 💤' : 'No transactions today 💤',
      tip: lang === 'ru' ? '💡 Продолжайте отслеживать расходы!' : lang === 'uz' ? '💡 Xarajatlarni kuzatishda davom eting!' : '💡 Keep tracking your spending!',
    };

    let message = `<b>${labels.title}</b>\n`;
    message += `📅 ${labels.date}: ${today}\n\n`;

    if (!transactions || transactions.length === 0) {
      message += `${labels.noTransactions}\n\n`;
      message += labels.tip;
    } else {
      const dayBalance = totalIncome - totalExpenses;
      const balanceSign = dayBalance >= 0 ? '+' : '';
      
      message += `<b>📈 ${labels.income}:</b> +${formatNumber(totalIncome)} UZS\n`;
      message += `<b>📉 ${labels.expenses}:</b> -${formatNumber(totalExpenses)} UZS\n`;
      message += `<b>💰 ${labels.balance}:</b> ${balanceSign}${formatNumber(dayBalance)} UZS\n\n`;
      
      if (topCategories.length > 0) {
        message += `<b>🏷 ${labels.topCategories}:</b>\n`;
        const categoryEmojis: Record<string, string> = {
          food: '🍕', restaurants: '🍽', taxi: '🚕', shopping: '🛍',
          transport: '🚌', entertainment: '🎮', health: '💊', bills: '📄',
          groceries: '🛒', coffee: '☕', fuel: '⛽', education: '📚',
        };
        
        topCategories.forEach(([cat, amount], index) => {
          const emoji = categoryEmojis[cat] || '📌';
          message += `  ${index + 1}. ${emoji} ${cat}: ${formatNumber(amount)} UZS\n`;
        });
        message += '\n';
      }
      
      message += `📋 ${labels.transactions}: ${transactions.length}\n\n`;
      message += labels.tip;
    }

    // Send the message
    const sent = await sendTelegramMessage(telegramUserId, message);

    return new Response(JSON.stringify({ 
      success: sent, 
      transactionCount: transactions?.length || 0,
      totalExpenses,
      totalIncome
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Daily summary error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
