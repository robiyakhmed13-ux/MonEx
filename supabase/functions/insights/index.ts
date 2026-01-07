// Supabase Edge Function: insights
// Heuristic-based financial insights (no LLM required)
// Returns: {id, emoji, text, severity, action?}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Transaction {
  id: string;
  type: 'expense' | 'income';
  amount: number;
  categoryId: string;
  description: string;
  date: string;
  time?: string;
}

interface InsightsRequest {
  transactions: Transaction[];
  balance: number;
  currency?: string;
  lang?: 'uz' | 'ru' | 'en';
}

interface Insight {
  id: string;
  emoji: string;
  text: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action?: string;
}

// Multi-language translations
const i18n = {
  uz: {
    lateNight: "Kechasi xarajatlar ko'paydi",
    stressSpending: "Stress xarajatlari oshdi",
    riskShort: (days: number) => `${days} kun ichida pul yetmasligi mumkin`,
    noInsights: "Hammasi yaxshi",
  },
  ru: {
    lateNight: "Обнаружены ночные траты",
    stressSpending: "Стрессовые траты увеличились",
    riskShort: (days: number) => `Риск: может не хватить через ${days} дней`,
    noInsights: "Всё в порядке",
  },
  en: {
    lateNight: "Late-night spending detected",
    stressSpending: "Stress spending increased",
    riskShort: (days: number) => `Risk: may run short in ${days} days`,
    noInsights: "All good",
  },
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle non-POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ 
      error: 'Method not allowed. Use POST with JSON body.',
      usage: { method: 'POST', body: { transactions: 'array', balance: 'number', lang: 'uz|ru|en' } }
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get auth token from header (optional but preferred)
    const authHeader = req.headers.get('Authorization');
    
    // Try to verify authentication if token is provided
    if (authHeader) {
      try {
        // Initialize Supabase client - use environment variables
        // Note: These should be set in the Edge Function environment
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
        
        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: authHeader } },
          });

          // Verify user is authenticated (non-blocking - if it fails, continue anyway)
          const { data: { user }, error: authError } = await supabase.auth.getUser();
          if (authError || !user) {
            // Log but don't block - allow unauthenticated requests for now
            console.warn('Auth verification failed:', authError?.message);
          }
        }
      } catch (authErr) {
        // If auth verification fails, continue anyway (for development/testing)
        console.warn('Auth check error:', authErr);
      }
    }

    // Parse request body
    let body: InsightsRequest;
    try {
      const text = await req.text();
      if (!text || text.trim() === '') {
        return new Response(JSON.stringify({ error: 'Empty request body.', insights: [] }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      body = JSON.parse(text);
    } catch (parseError) {
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body', insights: [] }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { transactions, balance, lang = 'en' } = body;
    const t = i18n[lang] || i18n.en;
    const insights: Insight[] = [];

    // If no transactions, return empty
    if (!transactions || transactions.length === 0) {
      return new Response(JSON.stringify({ insights: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const monthStart = today.slice(0, 7) + '-01';

    // Get expenses only
    const expenses = transactions.filter(tx => tx.amount < 0);
    const recentExpenses = expenses.filter(tx => tx.date >= twoWeeksAgo);
    const lastTwoWeeksExpenses = expenses.filter(tx => {
      const txDate = new Date(tx.date);
      const twoWeeksAgoDate = new Date(twoWeeksAgo);
      return txDate >= twoWeeksAgoDate && txDate < new Date(new Date(twoWeeksAgo).getTime() + 14 * 24 * 60 * 60 * 1000);
    });

    // ============================================
    // INSIGHT 1: Late-night spending (after 21:00)
    // ============================================
    const lateNightThreshold = 21; // 9 PM
    const lateNightExpenses = recentExpenses.filter(tx => {
      if (!tx.time) return false;
      const hour = parseInt(tx.time.split(':')[0]);
      return hour >= lateNightThreshold;
    });

    if (lateNightExpenses.length >= 3) {
      // Compare with previous period
      const previousPeriod = expenses.filter(tx => {
        const txDate = new Date(tx.date);
        const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
        const twoWeeksAgoDate = new Date(twoWeeksAgo);
        return txDate >= fourWeeksAgo && txDate < twoWeeksAgoDate;
      });
      
      const previousLateNight = previousPeriod.filter(tx => {
        if (!tx.time) return false;
        const hour = parseInt(tx.time.split(':')[0]);
        return hour >= lateNightThreshold;
      });

      // If current period has significantly more late-night spending
      if (lateNightExpenses.length > (previousLateNight.length * 1.5)) {
        insights.push({
          id: 'late-night-spending',
          emoji: '🌙',
          text: t.lateNight,
          severity: 'medium',
        });
      }
    }

    // ============================================
    // INSIGHT 2: Stress spending (category spikes)
    // ============================================
    // Calculate category spending for last 2 weeks vs previous 2 weeks
    const currentCategorySpending: Record<string, number> = {};
    const previousCategorySpending: Record<string, number> = {};

    const previousPeriodStart = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const previousPeriodEnd = twoWeeksAgo;

    recentExpenses.forEach(tx => {
      currentCategorySpending[tx.categoryId] = (currentCategorySpending[tx.categoryId] || 0) + Math.abs(tx.amount);
    });

    expenses.filter(tx => tx.date >= previousPeriodStart && tx.date < previousPeriodEnd).forEach(tx => {
      previousCategorySpending[tx.categoryId] = (previousCategorySpending[tx.categoryId] || 0) + Math.abs(tx.amount);
    });

    // Find categories with >50% increase
    for (const [categoryId, currentAmount] of Object.entries(currentCategorySpending)) {
      const previousAmount = previousCategorySpending[categoryId] || 0;
      if (previousAmount > 0 && currentAmount > previousAmount * 1.5) {
        insights.push({
          id: 'stress-spending',
          emoji: '📈',
          text: t.stressSpending,
          severity: 'high',
        });
        break; // Only show one stress spending insight
      }
    }

    // ============================================
    // INSIGHT 3: Risk detection (may run short)
    // ============================================
    // Calculate average daily spending for current month
    const monthExpenses = expenses.filter(tx => tx.date >= monthStart);
    const monthIncome = transactions
      .filter(tx => tx.amount > 0 && tx.date >= monthStart)
      .reduce((sum, tx) => sum + tx.amount, 0);

    if (monthExpenses.length > 0) {
      const daysElapsed = Math.max(1, now.getDate());
      const avgDailySpending = monthExpenses.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) / daysElapsed;
      
      // Project monthly spending
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const projectedMonthlySpending = avgDailySpending * daysInMonth;
      
      // Calculate available funds (balance + remaining income)
      const remainingDays = daysInMonth - daysElapsed;
      const projectedRemainingIncome = monthIncome > 0 ? (monthIncome / daysElapsed) * remainingDays : 0;
      const availableFunds = balance + projectedRemainingIncome;
      
      // Check if projected spending exceeds available funds
      if (projectedMonthlySpending > availableFunds && availableFunds > 0) {
        const daysUntilShort = Math.ceil((projectedMonthlySpending - availableFunds) / avgDailySpending);
        
        if (daysUntilShort <= 15) {
          insights.push({
            id: 'risk-short',
            emoji: '⚠️',
            text: t.riskShort(daysUntilShort),
            severity: daysUntilShort <= 7 ? 'critical' : 'high',
            action: 'review-budget',
          });
        }
      }
    }

    // ============================================
    // INSIGHT 4: Salary delay detection
    // ============================================
    // Find salary transactions (large income transactions)
    const incomeTransactions = transactions.filter(tx => tx.amount > 0);
    const largeIncome = incomeTransactions.filter(tx => tx.amount > 1000000); // Adjust threshold as needed
    
    if (largeIncome.length > 0) {
      // Group by month and find pattern
      const monthlyIncome: Record<string, number[]> = {};
      largeIncome.forEach(tx => {
        const month = tx.date.slice(0, 7);
        if (!monthlyIncome[month]) monthlyIncome[month] = [];
        monthlyIncome[month].push(tx.amount);
      });

      // Check if we're past expected salary date (e.g., if salary usually comes around day 1-5)
      const currentMonth = today.slice(0, 7);
      const currentDay = now.getDate();
      const hasSalaryThisMonth = monthlyIncome[currentMonth] && monthlyIncome[currentMonth].length > 0;
      
      // If no salary yet and we're past day 5, and previous months had salary
      if (!hasSalaryThisMonth && currentDay > 5) {
        const previousMonths = Object.keys(monthlyIncome).filter(m => m < currentMonth).sort().slice(-2);
        if (previousMonths.length >= 1) {
          // Check if previous months had salary around day 1-5
          const lastMonthWithSalary = previousMonths[previousMonths.length - 1];
          const lastMonthIncome = transactions.filter(tx => 
            tx.amount > 0 && tx.date.startsWith(lastMonthWithSalary)
          );
          const lastMonthSalaryDate = lastMonthIncome.length > 0 
            ? parseInt(lastMonthIncome[0].date.split('-')[2])
            : null;
          
          if (lastMonthSalaryDate && lastMonthSalaryDate <= 5) {
            insights.push({
              id: 'salary-delay',
              emoji: '⏰',
              text: lang === 'uz' ? 'Maosh kechikdi' : lang === 'ru' ? 'Зарплата задерживается' : 'Salary delayed',
              severity: 'medium',
            });
          }
        }
      }
    }

    // Return insights (max 3)
    return new Response(JSON.stringify({ 
      insights: insights.slice(0, 3),
      lastUpdated: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Insights function error:', err);
    return new Response(JSON.stringify({ 
      error: err instanceof Error ? err.message : 'Internal server error',
      insights: [],
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

