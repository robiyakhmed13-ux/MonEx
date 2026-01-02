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
    const categorySpending: Record<string, { count: number; total: number; times: string[] }> = {};
    const dayOfWeekSpending: Record<number, number> = {};
    const hourSpending: Record<number, number> = {};
    const lateNightSpending: Transaction[] = [];

    for (const tx of weeklyExpenses) {
      // Category analysis
      if (!categorySpending[tx.categoryId]) {
        categorySpending[tx.categoryId] = { count: 0, total: 0, times: [] };
      }
      categorySpending[tx.categoryId].count++;
      categorySpending[tx.categoryId].total += Math.abs(tx.amount);
      if (tx.time) categorySpending[tx.categoryId].times.push(tx.time);

      // Day of week
      const dayNum = new Date(tx.date).getDay();
      dayOfWeekSpending[dayNum] = (dayOfWeekSpending[dayNum] || 0) + Math.abs(tx.amount);

      // Hour analysis (late night = after 21:00)
      if (tx.time) {
        const hour = parseInt(tx.time.split(':')[0]);
        hourSpending[hour] = (hourSpending[hour] || 0) + Math.abs(tx.amount);
        if (hour >= 21 || hour < 6) {
          lateNightSpending.push(tx);
        }
      }
    }

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
      frequentCategories: frequentCategories.map(([cat, data]) => ({
        category: cat,
        count: data.count,
        total: data.total,
        avgPerTransaction: data.total / data.count
      })),
      lateNightSpendingCount: lateNightSpending.length,
      lateNightTotal: lateNightSpending.reduce((s, t) => s + Math.abs(t.amount), 0),
      limits: limits || [],
      goals: goals || [],
      transactionCount: transactions.length,
      recentTransactions: transactions.slice(0, 10).map(t => ({
        category: t.categoryId,
        amount: t.amount,
        date: t.date,
        description: t.description
      }))
    };

    const systemPrompt = `You are MonEX Financial Copilot - an AI that provides behavioral finance insights.

Your role is to:
1. Detect spending PATTERNS (not just totals)
2. Identify EMOTIONAL/STRESS spending (late night, frequent small purchases)
3. PREDICT future problems (running out of money, missing goals)
4. Suggest INTERVENTIONS (specific, actionable)

Language: ${lang === 'uz' ? 'Uzbek (use O\'zbekcha)' : lang === 'ru' ? 'Russian' : 'English'}

Respond with JSON array of insights. Each insight:
{
  "type": "warning" | "pattern" | "prediction" | "suggestion" | "achievement",
  "severity": "low" | "medium" | "high" | "critical",
  "icon": "emoji",
  "title": "short title",
  "message": "detailed message with specific numbers"
}

Key behaviors:
- Be SPECIFIC: "4th taxi this week" not "you use taxi often"
- Be PREDICTIVE: "At this rate, balance will be 0 in 12 days"
- Be BEHAVIORAL: "Late-night spending increased 40%"
- Be ACTIONABLE: "Set a 50k taxi limit for this week"

Maximum 5 most important insights. Focus on actionable, specific observations.`;

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

// Fallback insights when AI is unavailable
function generateFallbackInsights(ctx: any, lang: string): Insight[] {
  const insights: Insight[] = [];
  
  // Check balance warning
  if (ctx.currentBalance < ctx.avgDailySpending * 5) {
    insights.push({
      type: 'warning',
      severity: 'critical',
      icon: '⚠️',
      title: lang === 'ru' ? 'Низкий баланс' : lang === 'uz' ? 'Balans past' : 'Low balance',
      message: lang === 'ru' 
        ? `При текущих расходах баланс закончится через ${Math.floor(ctx.currentBalance / ctx.avgDailySpending)} дней`
        : lang === 'uz'
        ? `Joriy xarajatlar bilan balans ${Math.floor(ctx.currentBalance / ctx.avgDailySpending)} kunda tugaydi`
        : `At current spending rate, balance will run out in ${Math.floor(ctx.currentBalance / ctx.avgDailySpending)} days`
    });
  }

  // Late night spending
  if (ctx.lateNightSpendingCount >= 3) {
    insights.push({
      type: 'pattern',
      severity: 'medium',
      icon: '🌙',
      title: lang === 'ru' ? 'Ночные траты' : lang === 'uz' ? 'Tungi xarajatlar' : 'Late night spending',
      message: lang === 'ru'
        ? `${ctx.lateNightSpendingCount} покупок после 21:00 на сумму ${ctx.lateNightTotal.toLocaleString()}`
        : lang === 'uz'
        ? `21:00 dan keyin ${ctx.lateNightSpendingCount} ta xarid, jami ${ctx.lateNightTotal.toLocaleString()}`
        : `${ctx.lateNightSpendingCount} purchases after 9pm totaling ${ctx.lateNightTotal.toLocaleString()}`
    });
  }

  // Frequent category
  if (ctx.frequentCategories.length > 0) {
    const top = ctx.frequentCategories[0];
    insights.push({
      type: 'pattern',
      severity: 'low',
      icon: '📊',
      title: lang === 'ru' ? 'Частая категория' : lang === 'uz' ? 'Tez-tez kategoriya' : 'Frequent category',
      message: lang === 'ru'
        ? `${top.category}: ${top.count} раз за неделю (${top.total.toLocaleString()})`
        : lang === 'uz'
        ? `${top.category}: haftada ${top.count} marta (${top.total.toLocaleString()})`
        : `${top.category}: ${top.count} times this week (${top.total.toLocaleString()})`
    });
  }

  return insights;
}
