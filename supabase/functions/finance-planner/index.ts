import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Lovable AI Gateway key (auto-provisioned in this environment)
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

interface PlanRequest {
  prompt: string; // Natural language goal like "I want to save for a car in 1 year"
  currentBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  currency: string;
  lang: 'uz' | 'ru' | 'en';
  existingGoals?: Array<{ name: string; target: number; current: number }>;
}

interface FinancialPlan {
  goalName: string;
  targetAmount: number;
  monthlyRequired: number;
  timeframeMonths: number;
  deadline: string;
  feasibility: 'easy' | 'moderate' | 'challenging' | 'difficult';
  feasibilityScore: number; // 0-100
  savingsRate: number; // % of income
  recommendations: string[];
  milestones: Array<{ month: number; amount: number; description: string }>;
  warnings: string[];
  adjustments?: {
    ifCutExpenses: { by: number; newTimeframe: number };
    ifIncreaseIncome: { by: number; newTimeframe: number };
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      prompt, 
      currentBalance, 
      monthlyIncome, 
      monthlyExpenses, 
      currency, 
      lang,
      existingGoals 
    }: PlanRequest = await req.json();

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const monthlyNet = monthlyIncome - monthlyExpenses;
    const savingsCapacity = Math.max(0, monthlyNet * 0.8); // 80% of net as realistic savings

    const systemPrompt = `You are MonEX Financial Planner AI. Generate a personalized financial plan from natural language goals.

Your task:
1. Parse the user's goal from their natural language request
2. Calculate realistic savings plan based on their financial situation
3. Provide actionable milestones and recommendations
4. Warn about feasibility issues

User's Financial Situation:
- Current Balance: ${currentBalance} ${currency}
- Monthly Income: ${monthlyIncome} ${currency}
- Monthly Expenses: ${monthlyExpenses} ${currency}
- Monthly Net: ${monthlyNet} ${currency}
- Realistic Monthly Savings Capacity: ${savingsCapacity} ${currency}
- Existing Goals: ${JSON.stringify(existingGoals || [])}

Language: ${lang === 'uz' ? 'Uzbek' : lang === 'ru' ? 'Russian' : 'English'}

Return JSON (DO NOT wrap in markdown):
{
  "goalName": "Short goal name",
  "targetAmount": number,
  "monthlyRequired": number (how much to save per month),
  "timeframeMonths": number,
  "deadline": "YYYY-MM-DD",
  "feasibility": "easy" | "moderate" | "challenging" | "difficult",
  "feasibilityScore": 0-100 (100 = very easy, 0 = impossible),
  "savingsRate": number (% of income),
  "recommendations": ["actionable tip 1", "tip 2", ...],
  "milestones": [
    { "month": 3, "amount": X, "description": "First milestone" },
    { "month": 6, "amount": Y, "description": "Halfway point" },
    ...
  ],
  "warnings": ["any concerns or risks"],
  "adjustments": {
    "ifCutExpenses": { "by": amount, "newTimeframe": months },
    "ifIncreaseIncome": { "by": amount, "newTimeframe": months }
  }
}

Be realistic:
- If monthly savings < required, mark as "difficult" and suggest alternatives
- If timeframe is very short, calculate if it's actually possible
- Provide 3-5 milestones for tracking progress
- Give specific, actionable recommendations (not generic advice)`;

    console.log(`Processing plan request: "${prompt}" (lang: ${lang})`);

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
          { role: "user", content: `Create a financial plan for: "${prompt}"` },
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    
    // Parse the plan
    let plan: FinancialPlan;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        content.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, content];
      const jsonStr = (jsonMatch[1] || content).trim();
      plan = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse AI response:", e, content);
      // Generate fallback plan
      plan = generateFallbackPlan(prompt, currentBalance, monthlyIncome, monthlyExpenses, currency, lang);
    }

    console.log(`Generated plan: ${plan.goalName}, ${plan.targetAmount} ${currency} in ${plan.timeframeMonths} months`);

    return new Response(JSON.stringify({ plan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Finance Planner error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateFallbackPlan(
  prompt: string, 
  balance: number, 
  income: number, 
  expenses: number, 
  currency: string,
  lang: string
): FinancialPlan {
  // Try to extract numbers from prompt
  const amountMatch = prompt.match(/(\d+[\d\s]*)/);
  const targetAmount = amountMatch ? parseInt(amountMatch[1].replace(/\s/g, '')) : 10000000;
  
  const monthlyNet = income - expenses;
  const monthlyRequired = Math.round(monthlyNet * 0.3); // 30% of net
  const timeframeMonths = Math.ceil(targetAmount / monthlyRequired);
  
  const deadline = new Date();
  deadline.setMonth(deadline.getMonth() + timeframeMonths);

  const feasibilityScore = Math.min(100, Math.round((monthlyNet / monthlyRequired) * 50));
  
  const recommendations = lang === 'ru' ? [
    'Откладывайте деньги в начале месяца, сразу после зарплаты',
    'Создайте отдельный накопительный счёт',
    'Отслеживайте прогресс каждую неделю',
  ] : lang === 'uz' ? [
    'Oylik maoshdan keyin darhol pul ajrating',
    'Alohida jamg\'arma hisobi oching',
    'Har hafta taraqqiyotni kuzating',
  ] : [
    'Set aside money at the start of each month',
    'Create a separate savings account',
    'Track your progress weekly',
  ];

  return {
    goalName: lang === 'ru' ? 'Моя цель' : lang === 'uz' ? 'Mening maqsadim' : 'My Goal',
    targetAmount,
    monthlyRequired,
    timeframeMonths,
    deadline: deadline.toISOString().slice(0, 10),
    feasibility: feasibilityScore > 70 ? 'easy' : feasibilityScore > 40 ? 'moderate' : 'challenging',
    feasibilityScore,
    savingsRate: Math.round((monthlyRequired / income) * 100),
    recommendations,
    milestones: [
      { month: 1, amount: monthlyRequired, description: lang === 'ru' ? 'Первый взнос' : 'First deposit' },
      { month: Math.round(timeframeMonths / 2), amount: Math.round(targetAmount / 2), description: lang === 'ru' ? 'Половина пути' : 'Halfway' },
      { month: timeframeMonths, amount: targetAmount, description: lang === 'ru' ? 'Цель достигнута!' : 'Goal reached!' },
    ],
    warnings: [],
  };
}
