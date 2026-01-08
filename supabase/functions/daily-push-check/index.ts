import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface DailyCheckResult {
  user_id: string;
  notifications_sent: number;
  triggers_found: string[];
}

/**
 * Calculate average daily spending
 */
function calculateAvgDailySpending(transactions: any[]): number {
  const expenses = transactions.filter((t: any) => Number(t.amount) < 0);
  if (expenses.length === 0) return 0;

  const dates = expenses.map((t: any) => new Date(t.date).getTime());
  const oldestDate = new Date(Math.min(...dates));
  const newestDate = new Date(Math.max(...dates));
  const daysDiff = Math.max(1, Math.ceil((newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)));

  const totalSpent = expenses.reduce((sum: number, t: any) => sum + Math.abs(Number(t.amount)), 0);
  return totalSpent / daysDiff;
}

/**
 * Check triggers for a user and send push notifications
 */
async function checkUserTriggers(
  supabase: any,
  userId: string,
  transactions: any[],
  limits: any[],
  goals: any[],
  balance: number
): Promise<DailyCheckResult> {
  const triggers: string[] = [];
  let notificationsSent = 0;

  const avgDailySpending = calculateAvgDailySpending(transactions);
  const thisMonth = new Date().toISOString().slice(0, 7);

  // 1. Check limit exceeded
  for (const limit of limits) {
    const monthSpent = transactions
      .filter((t: any) => 
        t.category_id === limit.category_id &&
        t.date.startsWith(thisMonth) &&
        Number(t.amount) < 0
      )
      .reduce((sum: number, t: any) => sum + Math.abs(Number(t.amount)), 0);

    if (monthSpent > Number(limit.amount)) {
      triggers.push('limit_exceeded');
      await sendPushNotification(supabase, userId, {
        title: '⚠️ Limit Exceeded',
        body: `You've exceeded your ${limit.category_id} limit: ${monthSpent.toLocaleString()} / ${limit.amount.toLocaleString()}`,
        data: { type: 'limit_exceeded', action: 'set_limit' },
        priority: 'high',
      });
      notificationsSent++;
    }
  }

  // 2. Check suspicious pattern (late-night spending in last 24h)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const lateNightTx = transactions.filter((t: any) => {
    if (t.date < yesterday) return false;
    const txDate = new Date(t.date + (t.created_at ? 'T' + t.created_at.split('T')[1]?.slice(0, 5) : ''));
    const hour = txDate.getHours();
    return (hour >= 21 || hour < 6) && Number(t.amount) < 0;
  });

  if (lateNightTx.length >= 3) {
    const total = lateNightTx.reduce((sum: number, t: any) => sum + Math.abs(Number(t.amount)), 0);
    triggers.push('suspicious_pattern');
    await sendPushNotification(supabase, userId, {
      title: '🌙 Unusual Late-Night Spending',
      body: `${lateNightTx.length} purchases after 9pm (${total.toLocaleString()} total). This is unusual.`,
      data: { type: 'suspicious_pattern', action: 'open_copilot' },
      priority: 'normal',
    });
    notificationsSent++;
  }

  // 3. Check rent risk (run short in N days)
  if (avgDailySpending > 0) {
    const daysUntilZero = Math.floor(balance / avgDailySpending);
    if (daysUntilZero <= 7 && daysUntilZero > 0) {
      triggers.push('rent_risk');
      await sendPushNotification(supabase, userId, {
        title: '🚨 Low Balance Alert',
        body: `At current spending, you'll run short in ${daysUntilZero} days. Balance: ${balance.toLocaleString()}`,
        data: { type: 'rent_risk', action: 'open_copilot' },
        priority: 'high',
      });
      notificationsSent++;
    }
  }

  // 4. Check goal behind schedule
  for (const goal of goals) {
    if (goal.deadline) {
      const deadlineDate = new Date(goal.deadline);
      const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDeadline > 0 && daysUntilDeadline <= 30) {
        const daysSinceStart = Math.ceil((Date.now() - deadlineDate.getTime() + (365 * 24 * 60 * 60 * 1000)) / (1000 * 60 * 60 * 24));
        const expectedProgress = Math.min(100, (daysSinceStart / 365) * 100);
        const actualProgress = Number(goal.target) > 0 ? (Number(goal.current || 0) / Number(goal.target)) * 100 : 0;

        if (actualProgress < expectedProgress - 10) {
          triggers.push('goal_behind');
          await sendPushNotification(supabase, userId, {
            title: '🎯 Goal Behind Schedule',
            body: `${goal.name}: ${actualProgress.toFixed(0)}% complete, but should be ${expectedProgress.toFixed(0)}%. ${daysUntilDeadline} days left.`,
            data: { type: 'goal_behind', action: 'view_goals' },
            priority: 'normal',
          });
          notificationsSent++;
        }
      }
    }
  }

  return {
    user_id: userId,
    notifications_sent: notificationsSent,
    triggers_found: triggers,
  };
}

/**
 * Send push notification via Edge Function
 */
async function sendPushNotification(
  supabase: any,
  userId: string,
  notification: { title: string; body: string; data?: any; priority?: string }
): Promise<void> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
      },
      body: JSON.stringify({
        user_id: userId,
        title: notification.title,
        body: notification.body,
        data: notification.data,
        priority: notification.priority || 'normal',
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error(`Failed to send push to user ${userId}:`, error);
    }
  } catch (error) {
    console.error(`Error sending push to user ${userId}:`, error);
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get all users with device tokens
    const { data: users, error: usersError } = await supabase
      .from('user_devices')
      .select('user_id')
      .not('user_id', 'is', null);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch users' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No users with devices found', checked: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get unique user IDs
    const uniqueUserIds = [...new Set(users.map((u: any) => u.user_id))];

    const results: DailyCheckResult[] = [];

    // Check triggers for each user
    for (const userId of uniqueUserIds) {
      try {
        // Fetch user data
        const [txResult, limResult, goalResult, balanceResult] = await Promise.all([
          supabase
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false })
            .limit(500),
          supabase
            .from('limits')
            .select('*')
            .eq('user_id', userId),
          supabase
            .from('goals')
            .select('*')
            .eq('user_id', userId),
          supabase
            .from('transactions')
            .select('amount')
            .eq('user_id', userId),
        ]);

        const transactions = txResult.data || [];
        const limits = limResult.data || [];
        const goals = goalResult.data || [];
        
        // Calculate balance
        const balance = (balanceResult.data || []).reduce(
          (sum: number, t: any) => sum + Number(t.amount),
          0
        );

        const result = await checkUserTriggers(
          supabase,
          userId,
          transactions,
          limits,
          goals,
          balance
        );

        results.push(result);
      } catch (error) {
        console.error(`Error checking triggers for user ${userId}:`, error);
      }
    }

    const totalNotifications = results.reduce((sum, r) => sum + r.notifications_sent, 0);

    return new Response(
      JSON.stringify({
        message: 'Daily check completed',
        users_checked: results.length,
        notifications_sent: totalNotifications,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in daily-push-check:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

