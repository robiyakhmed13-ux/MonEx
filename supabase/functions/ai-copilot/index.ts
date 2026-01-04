import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transactions, balance, currency, limits, goals, lang }: AnalysisRequest = await req.json();

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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

    // Analyze patterns
    const categorySpending: Record<string, { count: number; total: number; times: string[]; dates: string[] }> = {};
    const dayOfWeekSpending: Record<number, number> = {};
    const hourSpending: Record<number, number> = {};
    const lateNightSpending: Transaction[] = [];
    const weekendSpending: Transaction[] = [];
    const stressIndicators: string[] = [];

    for (const tx of weeklyExpenses) {
      // Category analysis
      if (!categorySpending[tx.categoryId]) {
        categorySpending[tx.categoryId] = { count: 0, total: 0, times: [], dates: [] };
      }
      categorySpending[tx.categoryId].count++;
      categorySpending[tx.categoryId].total += Math.abs(tx.amount);
      if (tx.time) categorySpending[tx.categoryId].times.push(tx.time);
      categorySpending[tx.categoryId].dates.push(tx.date);

      // Day of week
      const txDate = new Date(tx.date);
      const dayNum = txDate.getDay();
      dayOfWeekSpending[dayNum] = (dayOfWeekSpending[dayNum] || 0) + Math.abs(tx.amount);
      
      // Weekend spending (Sat/Sun)
      if (dayNum === 0 || dayNum === 6) {
        weekendSpending.push(tx);
      }

      // Hour analysis (late night = after 21:00 or before 6:00)
      if (tx.time) {
        const hour = parseInt(tx.time.split(':')[0]);
        hourSpending[hour] = (hourSpending[hour] || 0) + Math.abs(tx.amount);
        if (hour >= 21 || hour < 6) {
          lateNightSpending.push(tx);
        }
      }
    }

    // STRESS SPENDING DETECTION
    // Pattern 1: Late-night transactions (emotional spending)
    if (lateNightSpending.length >= 3) {
      stressIndicators.push(`${lateNightSpending.length} late-night transactions (after 9pm)`);
    }

    // Pattern 2: Multiple small transactions in same category (impulse buying)
    for (const [catId, data] of Object.entries(categorySpending)) {
      if (data.count >= 5 && data.total / data.count < avgDailySpending * 0.3) {
        stressIndicators.push(`${data.count} small ${catId} purchases (possible impulse buying)`);
      }
    }

    // Pattern 3: Weekend overspending
    const weekendTotal = weekendSpending.reduce((s, t) => s + Math.abs(t.amount), 0);
    const weekdayTotal = weeklyExpenses.reduce((s, t) => s + Math.abs(t.amount), 0) - weekendTotal;
    if (weekendTotal > weekdayTotal * 0.5 && weekendSpending.length > 0) {
      stressIndicators.push(`Weekend spending is ${Math.round((weekendTotal / (weekdayTotal || 1)) * 100)}% of weekday spending`);
    }

    // PREDICTIVE MODELING
    // Predict days until balance hits zero
    let daysUntilZero = 0;
    if (avgDailySpending > 0 && balance > 0) {
      daysUntilZero = Math.floor(balance / avgDailySpending);
    }

    // Predict if user will miss rent/major expenses
    const majorUpcomingExpense = limits?.reduce((max, l) => Math.max(max, l.amount), 0) || 0;
    const canAffordRent = balance > majorUpcomingExpense;

    // Compare with previous week (if enough data)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const prevWeekTx = transactions.filter(t => t.date >= twoWeeksAgo && t.date < weekAgo && t.amount < 0);
    const prevWeekSpending = prevWeekTx.reduce((s, t) => s + Math.abs(t.amount), 0);
    const thisWeekSpending = weeklyExpenses.reduce((s, t) => s + Math.abs(t.amount), 0);
    const weekOverWeekChange = prevWeekSpending > 0 ? ((thisWeekSpending - prevWeekSpending) / prevWeekSpending) * 100 : 0;

    // Find repeated patterns
    const frequentCategories = Object.entries(categorySpending)
      .filter(([_, data]) => data.count >= 3)
      .sort((a, b) => b[1].count - a[1].count);

    // Calculate days until month end
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = daysInMonth - now.getDate();
    const avgDailySpending = monthlySpending / (now.getDate() || 1);
    const projectedMonthlySpending = avgDailySpending * daysInMonth;

    // Prepare context for AI
    const analysisContext = {
      currentBalance: balance,
      currency,
      monthlyIncome,
      monthlySpending,
      projectedMonthlySpending,
      daysLeftInMonth: daysLeft,
      avgDailySpending,
      
      // BEHAVIORAL PATTERNS
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
      
      // STRESS INDICATORS
      stressIndicators,
      
      // PREDICTIONS
      daysUntilBalanceZero: daysUntilZero,
      canAffordMajorExpense: canAffordRent,
      weekOverWeekSpendingChange: Math.round(weekOverWeekChange),
      
      // CONTEXT
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

    const systemPrompt = `You are MonEX Financial Copilot - the world's first BEHAVIORAL FINANCE AI that intervenes in real-time.

You are NOT a budgeting app. You are NOT a spending tracker. You ARE a behavioral psychologist for money.

YOUR REVOLUTIONARY MISSION (PATH A):
1. OBSERVE spending patterns (not just totals)
2. UNDERSTAND emotional/psychological triggers
3. INTERVENE before financial disaster
4. PREDICT future problems with precision

DETECTION FRAMEWORK:

🎯 STRESS SPENDING PATTERNS:
- Late-night purchases (21:00-06:00) = emotional regulation via shopping
- Multiple small transactions same day = impulse control issues
- Weekend overspending = work stress compensation
- Post-salary splurges = poor delayed gratification

🔮 PREDICTIVE WARNINGS (BE SPECIFIC):
- "At this rate, balance = 0 in ${daysUntilBalanceZero} days"
- "You'll miss rent in 12 days if spending continues"
- "4th taxi this week after 9pm - stress pattern detected"
- "Weekend spending up 40% - possible burnout indicator"

💡 BEHAVIORAL INTERVENTIONS (ACTIONABLE):
- "Set a 50,000 UZS taxi limit for this week"
- "Enable cooling-off period: 1-hour delay before purchases > 100K"
- "Move 20% of current balance to savings NOW before it's spent"
- "Your stress spending costs you 300K/month - that's 3.6M/year"

⚡ REAL-TIME INSIGHTS:
- Week-over-week spending change: ${weekOverWeekSpendingChange}%
- Stress indicators detected: ${stressIndicators.length}
- Days until financial zero: ${daysUntilZero}
- Late-night transactions: ${lateNightSpendingCount}

LANGUAGE: ${lang === 'uz' ? 'O\'zbekcha (Uzbek)' : lang === 'ru' ? 'Русский (Russian)' : 'English'}

RESPONSE FORMAT (JSON array, max 5 insights):
[
  {
    "type": "warning" | "pattern" | "prediction" | "suggestion" | "achievement",
    "severity": "low" | "medium" | "high" | "critical",
    "icon": "emoji (choose: ⚠️🌙📊💡🎯🔥💸⏰🎉)",
    "title": "SHORT, PUNCHY (max 30 chars)",
    "message": "SPECIFIC with numbers. NOT generic. NOT vague.",
    "action": "set_limit|move_money|enable_cooling|review_category",
    "actionLabel": "Button text (e.g., 'Set Limit', 'Move to Savings')"
  }
]

CRITICAL RULES:
❌ NO generic advice ("try to save more")
❌ NO obvious statements ("you spent money this week")
❌ NO praise without data ("good job!")
✅ SPECIFIC numbers ("4th taxi", "40% increase")
✅ BEHAVIORAL patterns ("late-night = stress")
✅ PREDICTIVE warnings ("0 balance in X days")
✅ ACTIONABLE interventions ("set 50K limit NOW")

This is NOT financial advice. This IS behavioral psychology applied to spending.

Be the AI that PREVENTS financial disaster, not just reports it.`;


    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this financial data and provide behavioral insights:\n\n${JSON.stringify(analysisContext, null, 2)}` }
        ],
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later", insights: [] }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';
    
    // Parse insights from AI response
    let insights: Insight[] = [];
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        content.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, content];
      const jsonStr = (jsonMatch[1] || content).trim();
      
      // Try to parse as array
      const parsed = JSON.parse(jsonStr);
      insights = Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      console.error("Failed to parse AI response:", e, content);
      // Fallback: generate basic insights locally
      insights = generateFallbackInsights(analysisContext, lang);
    }

    // Validate and limit insights
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

// Fallback insights when AI is unavailable - BEHAVIORAL FINANCE FOCUSED
function generateFallbackInsights(ctx: any, lang: string): Insight[] {
  const insights: Insight[] = [];
  
  // CRITICAL: Days until balance zero (PREDICTIVE)
  if (ctx.daysUntilBalanceZero > 0 && ctx.daysUntilBalanceZero <= 10) {
    insights.push({
      type: 'prediction',
      severity: ctx.daysUntilBalanceZero <= 3 ? 'critical' : 'high',
      icon: '⚠️',
      title: lang === 'ru' ? `Баланс = 0 через ${ctx.daysUntilBalanceZero}д` 
            : lang === 'uz' ? `${ctx.daysUntilBalanceZero} kunda balans 0` 
            : `Balance hits 0 in ${ctx.daysUntilBalanceZero} days`,
      message: lang === 'ru' 
        ? `При текущих расходах (${Math.round(ctx.avgDailySpending).toLocaleString()}/день) баланс закончится через ${ctx.daysUntilBalanceZero} дней. Сократите расходы на 30% СЕЙЧАС.`
        : lang === 'uz'
        ? `Joriy xarajatlar (${Math.round(ctx.avgDailySpending).toLocaleString()}/kun) bilan balans ${ctx.daysUntilBalanceZero} kunda tugaydi. Xarajatlarni 30% ga kamaytiring HOZIR.`
        : `At current spending (${Math.round(ctx.avgDailySpending).toLocaleString()}/day), balance will hit zero in ${ctx.daysUntilBalanceZero} days. Cut spending by 30% NOW.`,
      action: 'set_limit',
      actionLabel: lang === 'ru' ? 'Установить лимит' : lang === 'uz' ? 'Limit qo\'yish' : 'Set Limit'
    });
  }

  // STRESS PATTERN: Late night spending (BEHAVIORAL)
  if (ctx.lateNightSpendingCount >= 3) {
    const avgLateNight = Math.round(ctx.lateNightTotal / ctx.lateNightSpendingCount);
    insights.push({
      type: 'pattern',
      severity: ctx.lateNightSpendingCount >= 5 ? 'high' : 'medium',
      icon: '🌙',
      title: lang === 'ru' ? `${ctx.lateNightSpendingCount} ночных покупок` 
            : lang === 'uz' ? `${ctx.lateNightSpendingCount} ta tungi xarid` 
            : `${ctx.lateNightSpendingCount} late-night purchases`,
      message: lang === 'ru'
        ? `${ctx.lateNightSpendingCount} покупок после 21:00 (${ctx.lateNightTotal.toLocaleString()} сум, ~${avgLateNight.toLocaleString()} каждая). Паттерн стресс-трат - покупки для эмоциональной регуляции.`
        : lang === 'uz'
        ? `21:00 dan keyin ${ctx.lateNightSpendingCount} ta xarid (${ctx.lateNightTotal.toLocaleString()} so'm, ~${avgLateNight.toLocaleString()} har biri). Stress xarajat namunasi - hissiyot tartibga solish uchun xaridlar.`
        : `${ctx.lateNightSpendingCount} purchases after 9pm (${ctx.lateNightTotal.toLocaleString()}, ~${avgLateNight.toLocaleString()} each). Stress spending pattern - buying for emotional regulation.`,
      action: 'enable_cooling',
      actionLabel: lang === 'ru' ? 'Таймер покупок' : lang === 'uz' ? 'Xarid taymeri' : 'Purchase Timer'
    });
  }

  // INTERVENTION: Week-over-week spending increase (ACTIONABLE)
  if (ctx.weekOverWeekSpendingChange > 20) {
    insights.push({
      type: 'warning',
      severity: 'high',
      icon: '📈',
      title: lang === 'ru' ? `+${ctx.weekOverWeekSpendingChange}% за неделю` 
            : lang === 'uz' ? `Haftada +${ctx.weekOverWeekSpendingChange}%` 
            : `+${ctx.weekOverWeekSpendingChange}% week-over-week`,
      message: lang === 'ru'
        ? `Расходы выросли на ${ctx.weekOverWeekSpendingChange}% по сравнению с прошлой неделей. Если продолжится, месячный бюджет будет превышен на ${Math.round((ctx.projectedMonthlySpending - ctx.monthlyIncome) / 1000)}K.`
        : lang === 'uz'
        ? `Xarajatlar o'tgan haftaga nisbatan ${ctx.weekOverWeekSpendingChange}% o'sdi. Davom etsa, oylik byudjet ${Math.round((ctx.projectedMonthlySpending - ctx.monthlyIncome) / 1000)}K ga oshiriladi.`
        : `Spending up ${ctx.weekOverWeekSpendingChange}% vs last week. If continues, monthly budget will be exceeded by ${Math.round((ctx.projectedMonthlySpending - ctx.monthlyIncome) / 1000)}K.`,
      action: 'review_category',
      actionLabel: lang === 'ru' ? 'Найти причину' : lang === 'uz' ? 'Sabab topish' : 'Find Cause'
    });
  }

  // BEHAVIORAL: Frequent category (SPECIFIC)
  if (ctx.frequentCategories.length > 0) {
    const top = ctx.frequentCategories[0];
    const isHighFrequency = top.count >= 5;
    const avgAmount = Math.round(top.total / top.count);
    
    insights.push({
      type: isHighFrequency ? 'pattern' : 'suggestion',
      severity: isHighFrequency ? 'medium' : 'low',
      icon: isHighFrequency ? '🔥' : '📊',
      title: lang === 'ru' ? `${top.category}: ${top.count}x эта неделя` 
            : lang === 'uz' ? `${top.category}: bu hafta ${top.count}x` 
            : `${top.category}: ${top.count}x this week`,
      message: lang === 'ru'
        ? `${top.category} - ${top.count} раз за неделю (${top.total.toLocaleString()} сум, ~${avgAmount.toLocaleString()} за раз). ${isHighFrequency ? 'Это паттерн привычки. ' : ''}Установите лимит ${Math.round(top.total * 0.7).toLocaleString()} на следующую неделю?`
        : lang === 'uz'
        ? `${top.category} - haftada ${top.count} marta (${top.total.toLocaleString()} so'm, ~${avgAmount.toLocaleString()} har safar). ${isHighFrequency ? 'Bu odat namunasi. ' : ''}Keyingi haftaga ${Math.round(top.total * 0.7).toLocaleString()} limit qo'yasizmi?`
        : `${top.category} - ${top.count} times this week (${top.total.toLocaleString()}, ~${avgAmount.toLocaleString()} per transaction). ${isHighFrequency ? 'This is a habit pattern. ' : ''}Set a ${Math.round(top.total * 0.7).toLocaleString()} limit for next week?`,
      action: 'set_limit',
      actionLabel: lang === 'ru' ? 'Лимит -30%' : lang === 'uz' ? '-30% limit' : 'Limit -30%'
    });
  }

  // ACHIEVEMENT: Good savings behavior (POSITIVE REINFORCEMENT)
  if (ctx.weekOverWeekSpendingChange < -10 && ctx.weekOverWeekSpendingChange > -100) {
    insights.push({
      type: 'achievement',
      severity: 'low',
      icon: '🎉',
      title: lang === 'ru' ? `Экономия: ${Math.abs(ctx.weekOverWeekSpendingChange)}%` 
            : lang === 'uz' ? `Tejash: ${Math.abs(ctx.weekOverWeekSpendingChange)}%` 
            : `Savings: ${Math.abs(ctx.weekOverWeekSpendingChange)}%`,
      message: lang === 'ru'
        ? `Вы тратите на ${Math.abs(ctx.weekOverWeekSpendingChange)}% меньше чем на прошлой неделе! Если продолжите, сэкономите ${Math.round((ctx.monthlySpending - ctx.projectedMonthlySpending) / 1000)}K в этом месяце.`
        : lang === 'uz'
        ? `Siz o'tgan haftaga qaraganda ${Math.abs(ctx.weekOverWeekSpendingChange)}% kamroq sarflayapsiz! Davom etsangiz, bu oyda ${Math.round((ctx.monthlySpending - ctx.projectedMonthlySpending) / 1000)}K tejaysiz.`
        : `You're spending ${Math.abs(ctx.weekOverWeekSpendingChange)}% less than last week! If you continue, you'll save ${Math.round((ctx.monthlySpending - ctx.projectedMonthlySpending) / 1000)}K this month.`,
      action: 'move_money',
      actionLabel: lang === 'ru' ? 'В накопления' : lang === 'uz' ? 'Jamg\'armaga' : 'To Savings'
    });
  }

  return insights.slice(0, 5);
}
