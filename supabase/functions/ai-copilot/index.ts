import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Direct Gemini API key (your own)
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

interface Transaction {
  id: string;
  type: 'expense' | 'income';
  amount: number;
  categoryId: string;
  description: string;
  date: string;
  time?: string;
}

interface AnalysisRequest {
  transactions: Transaction[];
  balance: number;
  currency: string;
  limits?: Array<{ categoryId: string; amount: number }>;
  goals?: Array<{ name: string; target: number; current: number }>;
  lang: 'uz' | 'ru' | 'en';
}

interface Insight {
  type: 'warning' | 'pattern' | 'prediction' | 'suggestion' | 'achievement';
  severity: 'low' | 'medium' | 'high' | 'critical';
  icon: string;
  title: string;
  message: string;
  action?: string;
  actionLabel?: string;
}

// Call Gemini API directly
async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\n---\n\n${userPrompt}` }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1500,
        }
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API error:", response.status, errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transactions, balance, currency, limits, goals, lang }: AnalysisRequest = await req.json();

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    // Prepare spending analysis data
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const monthStart = today.slice(0, 7) + '-01';

    // Calculate metrics
    const thisWeekTx = transactions.filter(t => t.date >= weekAgo);
    const thisMonthTx = transactions.filter(t => t.date >= monthStart);
    
    const weeklyExpenses = thisWeekTx.filter(t => t.amount < 0);
    const monthlyExpenses = thisMonthTx.filter(t => t.amount < 0);
    const monthlyIncome = thisMonthTx.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const monthlySpending = monthlyExpenses.reduce((s, t) => s + Math.abs(t.amount), 0);
    
    // Calculate days until month end and daily spending
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = daysInMonth - now.getDate();
    const avgDailySpending = monthlySpending / (now.getDate() || 1);
    const projectedMonthlySpending = avgDailySpending * daysInMonth;

    // Analyze patterns
    const categorySpending: Record<string, { count: number; total: number; times: string[]; dates: string[] }> = {};
    const lateNightSpending: Transaction[] = [];
    const weekendSpending: Transaction[] = [];
    const stressIndicators: string[] = [];

    for (const tx of weeklyExpenses) {
      if (!categorySpending[tx.categoryId]) {
        categorySpending[tx.categoryId] = { count: 0, total: 0, times: [], dates: [] };
      }
      categorySpending[tx.categoryId].count++;
      categorySpending[tx.categoryId].total += Math.abs(tx.amount);
      if (tx.time) categorySpending[tx.categoryId].times.push(tx.time);
      categorySpending[tx.categoryId].dates.push(tx.date);

      const txDate = new Date(tx.date);
      const dayNum = txDate.getDay();
      
      if (dayNum === 0 || dayNum === 6) {
        weekendSpending.push(tx);
      }

      if (tx.time) {
        const hour = parseInt(tx.time.split(':')[0]);
        if (hour >= 21 || hour < 6) {
          lateNightSpending.push(tx);
        }
      }
    }

    // STRESS SPENDING DETECTION
    if (lateNightSpending.length >= 3) {
      stressIndicators.push(`${lateNightSpending.length} late-night transactions (after 9pm)`);
    }

    for (const [catId, data] of Object.entries(categorySpending)) {
      if (data.count >= 5 && data.total / data.count < avgDailySpending * 0.3) {
        stressIndicators.push(`${data.count} small ${catId} purchases (possible impulse buying)`);
      }
    }

    const weekendTotal = weekendSpending.reduce((s, t) => s + Math.abs(t.amount), 0);
    const weekdayTotal = weeklyExpenses.reduce((s, t) => s + Math.abs(t.amount), 0) - weekendTotal;
    if (weekendTotal > weekdayTotal * 0.5 && weekendSpending.length > 0) {
      stressIndicators.push(`Weekend spending is ${Math.round((weekendTotal / (weekdayTotal || 1)) * 100)}% of weekday spending`);
    }

    // PREDICTIVE MODELING
    let daysUntilZero = 0;
    if (avgDailySpending > 0 && balance > 0) {
      daysUntilZero = Math.floor(balance / avgDailySpending);
    }

    const majorUpcomingExpense = limits?.reduce((max, l) => Math.max(max, l.amount), 0) || 0;
    const canAffordRent = balance > majorUpcomingExpense;

    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const prevWeekTx = transactions.filter(t => t.date >= twoWeeksAgo && t.date < weekAgo && t.amount < 0);
    const prevWeekSpending = prevWeekTx.reduce((s, t) => s + Math.abs(t.amount), 0);
    const thisWeekSpending = weeklyExpenses.reduce((s, t) => s + Math.abs(t.amount), 0);
    const weekOverWeekChange = prevWeekSpending > 0 ? ((thisWeekSpending - prevWeekSpending) / prevWeekSpending) * 100 : 0;

    const frequentCategories = Object.entries(categorySpending)
      .filter(([_, data]) => data.count >= 3)
      .sort((a, b) => b[1].count - a[1].count);

    const analysisContext = {
      currentBalance: balance,
      currency,
      monthlyIncome,
      monthlySpending,
      projectedMonthlySpending,
      daysLeftInMonth: daysLeft,
      avgDailySpending,
      frequentCategories: frequentCategories.map(([cat, data]) => ({
        category: cat,
        count: data.count,
        total: data.total,
        avgPerTransaction: data.total / data.count,
        dates: data.dates
      })),
      lateNightSpendingCount: lateNightSpending.length,
      lateNightTotal: lateNightSpending.reduce((s, t) => s + Math.abs(t.amount), 0),
      weekendSpendingCount: weekendSpending.length,
      weekendSpendingTotal: weekendTotal,
      stressIndicators,
      daysUntilBalanceZero: daysUntilZero,
      canAffordMajorExpense: canAffordRent,
      weekOverWeekSpendingChange: Math.round(weekOverWeekChange),
      limits: limits || [],
      goals: goals || [],
      transactionCount: transactions.length,
      recentTransactions: transactions.slice(0, 10).map(t => ({
        category: t.categoryId,
        amount: t.amount,
        date: t.date,
        time: t.time,
        description: t.description
      }))
    };

    const systemPrompt = `You are MonEX Financial Copilot - the world's first BEHAVIORAL FINANCE AI.

YOUR MISSION:
1. OBSERVE spending patterns
2. UNDERSTAND emotional/psychological triggers
3. INTERVENE before financial disaster
4. PREDICT future problems with precision

DETECTION FRAMEWORK:
- Late-night purchases (21:00-06:00) = emotional regulation via shopping
- Multiple small transactions same day = impulse control issues
- Weekend overspending = work stress compensation

PREDICTIVE WARNINGS:
- "At this rate, balance = 0 in ${analysisContext.daysUntilBalanceZero} days"
- Week-over-week spending change: ${analysisContext.weekOverWeekSpendingChange}%
- Stress indicators detected: ${stressIndicators.length}
- Late-night transactions: ${analysisContext.lateNightSpendingCount}

LANGUAGE: ${lang === 'uz' ? 'Uzbek' : lang === 'ru' ? 'Russian' : 'English'}

RESPONSE FORMAT (JSON array, max 5 insights):
[
  {
    "type": "warning" | "pattern" | "prediction" | "suggestion" | "achievement",
    "severity": "low" | "medium" | "high" | "critical",
    "icon": "emoji",
    "title": "SHORT, PUNCHY (max 30 chars)",
    "message": "SPECIFIC with numbers",
    "action": "set_limit|move_money|enable_cooling|review_category",
    "actionLabel": "Button text"
  }
]

CRITICAL RULES:
- NO generic advice
- SPECIFIC numbers
- BEHAVIORAL patterns
- PREDICTIVE warnings
- ACTIONABLE interventions`;


    const content = await callGemini(
      systemPrompt,
      `Analyze this financial data and provide behavioral insights:\n\n${JSON.stringify(analysisContext, null, 2)}`
    );
    
    // Parse insights from AI response
    let insights: Insight[] = [];
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        content.match(/```\s*([\s\S]*?)\s*```/) ||
                        content.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]).trim() : content.trim();
      
      const parsed = JSON.parse(jsonStr);
      insights = Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      console.error("Failed to parse AI response:", e, content);
      insights = generateFallbackInsights(analysisContext, lang);
    }

    insights = insights
      .filter(i => i.type && i.severity && i.title && i.message)
      .slice(0, 5);

    console.log(`Generated ${insights.length} insights for user`);

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("AI Copilot error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      insights: []
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Fallback insights when AI is unavailable
function generateFallbackInsights(ctx: any, lang: string): Insight[] {
  const insights: Insight[] = [];
  
  if (ctx.daysUntilBalanceZero > 0 && ctx.daysUntilBalanceZero <= 10) {
    insights.push({
      type: 'prediction',
      severity: ctx.daysUntilBalanceZero <= 3 ? 'critical' : 'high',
      icon: '⚠️',
      title: lang === 'ru' ? `Баланс = 0 через ${ctx.daysUntilBalanceZero}д` 
            : lang === 'uz' ? `${ctx.daysUntilBalanceZero} kunda balans 0` 
            : `Balance hits 0 in ${ctx.daysUntilBalanceZero} days`,
      message: lang === 'ru' 
        ? `При текущих расходах баланс закончится через ${ctx.daysUntilBalanceZero} дней.`
        : lang === 'uz'
        ? `Joriy xarajatlar bilan balans ${ctx.daysUntilBalanceZero} kunda tugaydi.`
        : `At current spending, balance will hit zero in ${ctx.daysUntilBalanceZero} days.`,
      action: 'set_limit',
      actionLabel: lang === 'ru' ? 'Установить лимит' : lang === 'uz' ? 'Limit qo\'yish' : 'Set Limit'
    });
  }

  if (ctx.lateNightSpendingCount >= 3) {
    insights.push({
      type: 'pattern',
      severity: ctx.lateNightSpendingCount >= 5 ? 'high' : 'medium',
      icon: '🌙',
      title: lang === 'ru' ? `${ctx.lateNightSpendingCount} ночных покупок` 
            : lang === 'uz' ? `${ctx.lateNightSpendingCount} ta tungi xarid` 
            : `${ctx.lateNightSpendingCount} late-night purchases`,
      message: lang === 'ru'
        ? `${ctx.lateNightSpendingCount} покупок после 21:00. Паттерн стресс-трат.`
        : lang === 'uz'
        ? `21:00 dan keyin ${ctx.lateNightSpendingCount} ta xarid. Stress xarajat namunasi.`
        : `${ctx.lateNightSpendingCount} purchases after 9pm. Stress spending pattern.`,
      action: 'enable_cooling',
      actionLabel: lang === 'ru' ? 'Таймер покупок' : lang === 'uz' ? 'Xarid taymeri' : 'Purchase Timer'
    });
  }

  if (ctx.weekOverWeekSpendingChange > 20) {
    insights.push({
      type: 'warning',
      severity: 'high',
      icon: '📈',
      title: lang === 'ru' ? `+${ctx.weekOverWeekSpendingChange}% за неделю` 
            : lang === 'uz' ? `Haftada +${ctx.weekOverWeekSpendingChange}%` 
            : `+${ctx.weekOverWeekSpendingChange}% week-over-week`,
      message: lang === 'ru'
        ? `Расходы выросли на ${ctx.weekOverWeekSpendingChange}% по сравнению с прошлой неделей.`
        : lang === 'uz'
        ? `Xarajatlar o'tgan haftaga nisbatan ${ctx.weekOverWeekSpendingChange}% o'sdi.`
        : `Spending up ${ctx.weekOverWeekSpendingChange}% vs last week.`,
      action: 'review_category',
      actionLabel: lang === 'ru' ? 'Найти причину' : lang === 'uz' ? 'Sabab topish' : 'Find Cause'
    });
  }

  return insights;
}
