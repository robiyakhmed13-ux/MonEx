import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface PlanRequest {
  prompt: string; // Natural language goal like "I want to save for a car in 1 year"
  currentBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  currency: string;
  lang: 'uz' | 'ru' | 'en';
  userId?: string; // For saving to database
  existingGoals?: Array<{ name: string; target: number; current: number }>;
}

interface FinancialPlan {
  goalName: string;
  targetAmount: number;
  monthlyRequired: number;
  timeframeMonths: number;
  deadline: string;
  feasibility: 'easy' | 'moderate' | 'challenging' | 'difficult';
  feasibilityScore: number;
  savingsRate: number;
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

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ 
      error: 'Method not allowed. Use POST with JSON body.',
      usage: {
        method: 'POST',
        body: { prompt: 'string', currentBalance: 'number', monthlyIncome: 'number', monthlyExpenses: 'number', currency: 'string', lang: 'uz|ru|en' }
      }
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    let body: PlanRequest;
    try {
      const text = await req.text();
      if (!text || text.trim() === '') {
        return new Response(JSON.stringify({ error: 'Empty request body. Please provide JSON data.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      body = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { prompt, currentBalance, monthlyIncome, monthlyExpenses, currency, lang, userId, existingGoals } = body;

    if (!prompt || currentBalance === undefined || monthlyIncome === undefined || monthlyExpenses === undefined) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: prompt, currentBalance, monthlyIncome, monthlyExpenses' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not configured");
      // Return fallback plan
      const plan = generateFallbackPlan(prompt, currentBalance, monthlyIncome, monthlyExpenses, currency, lang);
      return new Response(JSON.stringify({ plan }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const monthlyNet = monthlyIncome - monthlyExpenses;
    const savingsCapacity = Math.max(0, monthlyNet * 0.8);

    const langName = lang === 'uz' ? 'Uzbek' : lang === 'ru' ? 'Russian' : 'English';
    
    const systemPrompt = `You are MonEX Financial Planner AI - a revolutionary financial logic generator.

Your task: Generate a COMPLETE, ACTIONABLE financial plan from natural language.

User's Financial Situation:
- Current Balance: ${currentBalance} ${currency}
- Monthly Income: ${monthlyIncome} ${currency}
- Monthly Expenses: ${monthlyExpenses} ${currency}
- Monthly Net: ${monthlyNet} ${currency}
- Realistic Monthly Savings: ${savingsCapacity} ${currency}
- Existing Goals: ${JSON.stringify(existingGoals || [])}

Language: ${langName}

CRITICAL: Return ONLY valid JSON (no markdown, no code blocks):
{
  "goalName": "Short descriptive name in ${langName}",
  "targetAmount": number,
  "monthlyRequired": number,
  "timeframeMonths": number,
  "deadline": "YYYY-MM-DD",
  "feasibility": "easy" | "moderate" | "challenging" | "difficult",
  "feasibilityScore": 0-100,
  "savingsRate": number (% of income),
  "recommendations": ["tip1", "tip2", "tip3", "tip4", "tip5"],
  "milestones": [
    { "month": 1, "amount": X, "description": "First step" },
    { "month": 3, "amount": Y, "description": "Quarter check" },
    { "month": 6, "amount": Z, "description": "Halfway" },
    { "month": N, "amount": target, "description": "Goal!" }
  ],
  "warnings": ["risk1 if any"],
  "adjustments": {
    "ifCutExpenses": { "by": amount, "newTimeframe": months },
    "ifIncreaseIncome": { "by": amount, "newTimeframe": months }
  }
}

Rules:
1. Parse the goal from user's natural language
2. If timeframe is mentioned, use it; otherwise calculate optimal
3. Feasibility: easy (savings < 20% income), moderate (20-40%), challenging (40-60%), difficult (>60%)
4. Give 5 SPECIFIC, ACTIONABLE recommendations (not generic)
5. Create 4-6 milestones for tracking
6. Warnings only if there are real risks
7. All text in ${langName}`;

    console.log(`Processing plan request: "${prompt}" (lang: ${lang})`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Create a complete financial plan for: "${prompt}"` },
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limited");
        const plan = generateFallbackPlan(prompt, currentBalance, monthlyIncome, monthlyExpenses, currency, lang);
        return new Response(JSON.stringify({ plan, warning: "AI rate limited, using calculated plan" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        console.error("Payment required");
        const plan = generateFallbackPlan(prompt, currentBalance, monthlyIncome, monthlyExpenses, currency, lang);
        return new Response(JSON.stringify({ plan, warning: "AI credits exhausted" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("OPEN AI error:", response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    
    let plan: FinancialPlan;
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        content.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, content];
      const jsonStr = (jsonMatch[1] || content).trim();
      plan = JSON.parse(jsonStr);
      
      // Validate and fix plan
      plan = validateAndFixPlan(plan, prompt, currentBalance, monthlyIncome, monthlyExpenses, currency, lang);
    } catch (e) {
      console.error("Failed to parse AI response:", e, content);
      plan = generateFallbackPlan(prompt, currentBalance, monthlyIncome, monthlyExpenses, currency, lang);
    }

    console.log(`Generated plan: ${plan.goalName}, ${plan.targetAmount} ${currency} in ${plan.timeframeMonths} months`);

    // Save goal to database if userId provided
    if (userId && plan) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        
        // Don't auto-save, just return the plan
        // User will click "Add Goal" button to save
        console.log(`Plan ready for user ${userId}: ${plan.goalName}`);
      } catch (dbError) {
        console.error('Database error:', dbError);
      }
    }

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

function validateAndFixPlan(
  plan: any,
  prompt: string,
  balance: number,
  income: number,
  expenses: number,
  currency: string,
  lang: string
): FinancialPlan {
  const monthlyNet = income - expenses;
  
  // Ensure all required fields exist
  const targetAmount = plan.targetAmount || extractAmountFromPrompt(prompt) || 10000000;
  const timeframeMonths = plan.timeframeMonths || extractMonthsFromPrompt(prompt) || 12;
  const monthlyRequired = plan.monthlyRequired || Math.ceil(targetAmount / timeframeMonths);
  
  const savingsRate = Math.round((monthlyRequired / income) * 100);
  let feasibility: 'easy' | 'moderate' | 'challenging' | 'difficult';
  let feasibilityScore: number;
  
  if (monthlyRequired <= monthlyNet * 0.3) {
    feasibility = 'easy';
    feasibilityScore = 85;
  } else if (monthlyRequired <= monthlyNet * 0.5) {
    feasibility = 'moderate';
    feasibilityScore = 65;
  } else if (monthlyRequired <= monthlyNet * 0.8) {
    feasibility = 'challenging';
    feasibilityScore = 40;
  } else {
    feasibility = 'difficult';
    feasibilityScore = 20;
  }

  const deadline = new Date();
  deadline.setMonth(deadline.getMonth() + timeframeMonths);

  return {
    goalName: plan.goalName || (lang === 'ru' ? 'Моя цель' : lang === 'uz' ? 'Mening maqsadim' : 'My Goal'),
    targetAmount,
    monthlyRequired,
    timeframeMonths,
    deadline: plan.deadline || deadline.toISOString().slice(0, 10),
    feasibility: plan.feasibility || feasibility,
    feasibilityScore: plan.feasibilityScore || feasibilityScore,
    savingsRate: plan.savingsRate || savingsRate,
    recommendations: plan.recommendations || getDefaultRecommendations(lang),
    milestones: plan.milestones || generateMilestones(targetAmount, timeframeMonths, lang),
    warnings: plan.warnings || [],
    adjustments: plan.adjustments,
  };
}

function extractAmountFromPrompt(prompt: string): number | null {
  // Try to extract numbers like "50 million", "50M", "50000000", "50 mln"
  const patterns = [
    /(\d+)\s*(million|mln|млн|m)/i,
    /(\d+[\d\s,]*)\s*(uzs|so'm|сум)?/i,
  ];
  
  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (match) {
      let num = parseFloat(match[1].replace(/[\s,]/g, ''));
      if (prompt.toLowerCase().includes('million') || 
          prompt.toLowerCase().includes('mln') || 
          prompt.toLowerCase().includes('млн') ||
          prompt.toLowerCase().includes('m ')) {
        num *= 1000000;
      }
      return num;
    }
  }
  return null;
}

function extractMonthsFromPrompt(prompt: string): number | null {
  const patterns = [
    /(\d+)\s*(year|yil|год|лет)/i,
    /(\d+)\s*(month|oy|месяц)/i,
  ];
  
  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (match) {
      let months = parseInt(match[1]);
      if (prompt.toLowerCase().includes('year') || 
          prompt.toLowerCase().includes('yil') || 
          prompt.toLowerCase().includes('год') ||
          prompt.toLowerCase().includes('лет')) {
        months *= 12;
      }
      return months;
    }
  }
  return null;
}

function getDefaultRecommendations(lang: string): string[] {
  if (lang === 'ru') {
    return [
      'Откладывайте деньги сразу после получения зарплаты',
      'Создайте отдельный накопительный счёт',
      'Отслеживайте прогресс каждую неделю в приложении',
      'Сократите ненужные подписки и расходы',
      'Установите автоматический перевод на накопления',
    ];
  } else if (lang === 'uz') {
    return [
      'Oylik maoshdan keyin darhol pul ajrating',
      'Alohida jamg\'arma hisobi oching',
      'Har hafta ilovada taraqqiyotni kuzating',
      'Keraksiz obunalar va xarajatlarni kamaytiring',
      'Jamg\'armaga avtomatik o\'tkazmani o\'rnating',
    ];
  }
  return [
    'Set aside money immediately after receiving salary',
    'Create a separate savings account',
    'Track your progress weekly in the app',
    'Cut unnecessary subscriptions and expenses',
    'Set up automatic transfers to savings',
  ];
}

function generateMilestones(target: number, months: number, lang: string): Array<{ month: number; amount: number; description: string }> {
  const milestones = [];
  const step = Math.ceil(target / 4);
  
  const descriptions = {
    ru: ['Первый шаг!', 'Четверть пути', 'На полпути!', 'Почти у цели!', 'Цель достигнута! 🎉'],
    uz: ['Birinchi qadam!', 'Chorak yo\'l', 'Yarim yo\'lda!', 'Maqsadga yaqin!', 'Maqsadga erishildi! 🎉'],
    en: ['First step!', 'Quarter way', 'Halfway there!', 'Almost there!', 'Goal reached! 🎉'],
  };
  
  const desc = descriptions[lang as keyof typeof descriptions] || descriptions.en;
  
  milestones.push({ month: 1, amount: Math.round(target / months), description: desc[0] });
  milestones.push({ month: Math.round(months / 4), amount: step, description: desc[1] });
  milestones.push({ month: Math.round(months / 2), amount: step * 2, description: desc[2] });
  milestones.push({ month: Math.round(months * 0.75), amount: step * 3, description: desc[3] });
  milestones.push({ month: months, amount: target, description: desc[4] });
  
  return milestones;
}

function generateFallbackPlan(
  prompt: string, 
  balance: number, 
  income: number, 
  expenses: number, 
  currency: string,
  lang: string
): FinancialPlan {
  const targetAmount = extractAmountFromPrompt(prompt) || 10000000;
  const timeframeMonths = extractMonthsFromPrompt(prompt) || 12;
  
  const monthlyNet = income - expenses;
  const monthlyRequired = Math.ceil(targetAmount / timeframeMonths);
  
  const deadline = new Date();
  deadline.setMonth(deadline.getMonth() + timeframeMonths);

  const savingsRate = Math.round((monthlyRequired / income) * 100);
  const feasibilityScore = Math.min(100, Math.round((monthlyNet / monthlyRequired) * 50));
  
  let feasibility: 'easy' | 'moderate' | 'challenging' | 'difficult';
  if (feasibilityScore > 70) feasibility = 'easy';
  else if (feasibilityScore > 50) feasibility = 'moderate';
  else if (feasibilityScore > 30) feasibility = 'challenging';
  else feasibility = 'difficult';

  return {
    goalName: lang === 'ru' ? 'Моя цель' : lang === 'uz' ? 'Mening maqsadim' : 'My Goal',
    targetAmount,
    monthlyRequired,
    timeframeMonths,
    deadline: deadline.toISOString().slice(0, 10),
    feasibility,
    feasibilityScore,
    savingsRate,
    recommendations: getDefaultRecommendations(lang),
    milestones: generateMilestones(targetAmount, timeframeMonths, lang),
    warnings: feasibility === 'difficult' ? [
      lang === 'ru' ? 'Эта цель потребует значительных усилий' : 
      lang === 'uz' ? 'Bu maqsad katta harakat talab qiladi' : 
      'This goal will require significant effort'
    ] : [],
  };
}
