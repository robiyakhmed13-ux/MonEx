import { Transaction, Limit, Goal } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { api } from './api';

interface TriggerCheckResult {
  triggered: boolean;
  type?: 'limit_exceeded' | 'goal_behind' | 'suspicious_pattern' | 'rent_risk';
  message?: string;
  title?: string;
}

/**
 * Check if a new transaction triggers any push notification rules
 */
export async function checkTransactionTriggers(
  transaction: Transaction,
  userId: string,
  allTransactions: Transaction[],
  limits: Limit[],
  goals: Goal[],
  balance: number
): Promise<TriggerCheckResult[]> {
  const triggers: TriggerCheckResult[] = [];

  // 1. Check limit exceeded
  if (transaction.type === 'expense' && transaction.amount < 0) {
    const limit = limits.find(l => l.categoryId === transaction.categoryId);
    if (limit) {
      const thisMonth = new Date().toISOString().slice(0, 7);
      const monthSpent = allTransactions
        .filter(t => 
          t.categoryId === transaction.categoryId &&
          t.date.startsWith(thisMonth) &&
          t.amount < 0
        )
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      if (monthSpent > limit.amount) {
        triggers.push({
          triggered: true,
          type: 'limit_exceeded',
          title: '⚠️ Limit Exceeded',
          message: `You've exceeded your ${limit.categoryId} limit: ${monthSpent.toLocaleString()} / ${limit.amount.toLocaleString()}`,
        });
      }
    }
  }

  // 2. Check suspicious pattern (late-night spike)
  if (transaction.type === 'expense' && transaction.amount < 0) {
    const now = new Date();
    const hour = now.getHours();
    const isLateNight = hour >= 21 || hour < 6;

    if (isLateNight) {
      // Check last 24 hours for late-night transactions
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const lateNightTx = allTransactions.filter(t => {
        if (t.date < yesterday) return false;
        const txDate = new Date(t.date);
        const txHour = txDate.getHours();
        return (txHour >= 21 || txHour < 6) && t.amount < 0;
      });

      if (lateNightTx.length >= 3) {
        const total = lateNightTx.reduce((s, t) => s + Math.abs(t.amount), 0);
        triggers.push({
          triggered: true,
          type: 'suspicious_pattern',
          title: '🌙 Unusual Late-Night Spending',
          message: `${lateNightTx.length} purchases after 9pm (${total.toLocaleString()} total). This is unusual.`,
        });
      }
    }
  }

  // 3. Check rent risk (run short in N days)
  if (transaction.type === 'expense' && transaction.amount < 0) {
    const avgDailySpending = calculateAvgDailySpending(allTransactions);
    if (avgDailySpending > 0) {
      const daysUntilZero = Math.floor(balance / avgDailySpending);
      if (daysUntilZero <= 7 && daysUntilZero > 0) {
        triggers.push({
          triggered: true,
          type: 'rent_risk',
          title: '🚨 Low Balance Alert',
          message: `At current spending, you'll run short in ${daysUntilZero} days. Balance: ${balance.toLocaleString()}`,
        });
      }
    }
  }

  // 4. Check goal behind schedule
  for (const goal of goals) {
    if (goal.deadline) {
      const daysUntilDeadline = Math.ceil(
        (new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      const daysSinceStart = Math.ceil(
        (Date.now() - new Date(goal.deadline).getTime() + (365 * 24 * 60 * 60 * 1000)) / (1000 * 60 * 60 * 24)
      );
      const expectedProgress = Math.min(100, (daysSinceStart / 365) * 100);
      const actualProgress = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;

      if (actualProgress < expectedProgress - 10 && daysUntilDeadline > 0 && daysUntilDeadline <= 30) {
        triggers.push({
          triggered: true,
          type: 'goal_behind',
          title: '🎯 Goal Behind Schedule',
          message: `${goal.name}: ${actualProgress.toFixed(0)}% complete, but should be ${expectedProgress.toFixed(0)}%. ${daysUntilDeadline} days left.`,
        });
      }
    }
  }

  return triggers;
}

/**
 * Calculate average daily spending from transactions
 */
function calculateAvgDailySpending(transactions: Transaction[]): number {
  const expenses = transactions.filter(t => t.amount < 0);
  if (expenses.length === 0) return 0;

  const oldestDate = new Date(Math.min(...expenses.map(t => new Date(t.date).getTime())));
  const newestDate = new Date(Math.max(...expenses.map(t => new Date(t.date).getTime())));
  const daysDiff = Math.max(1, Math.ceil((newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)));

  const totalSpent = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  return totalSpent / daysDiff;
}

/**
 * Send push notification for a trigger
 */
export async function sendPushNotificationForTrigger(
  userId: string,
  trigger: TriggerCheckResult
): Promise<void> {
  if (!trigger.triggered || !trigger.title || !trigger.message) return;

  try {
    await api.sendPushNotification({
      user_id: userId,
      title: trigger.title,
      body: trigger.message,
      data: {
        type: trigger.type,
        action: getActionForTrigger(trigger.type),
      },
      priority: trigger.type === 'rent_risk' || trigger.type === 'limit_exceeded' ? 'high' : 'normal',
    });
  } catch (error) {
    console.error('Failed to send push notification:', error);
  }
}

function getActionForTrigger(type?: string): string {
  switch (type) {
    case 'limit_exceeded':
      return 'set_limit';
    case 'goal_behind':
      return 'view_goals';
    case 'suspicious_pattern':
    case 'rent_risk':
      return 'open_copilot';
    default:
      return 'view_transactions';
  }
}

