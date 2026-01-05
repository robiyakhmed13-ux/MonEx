import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';

export interface FinancialAlert {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'achievement';
  title: string;
  message: string;
  action?: string;
  actionData?: Record<string, any>;
  timestamp: Date;
  priority: number; // 1-5, 5 being highest
}

export class NotificationManager {
  private static instance: NotificationManager;
  private isNative = Capacitor.isNativePlatform();
  private notificationsEnabled = false;

  private constructor() {
    this.initialize();
  }

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  private async initialize() {
    if (!this.isNative) {
      console.log('Running in browser, using browser notifications');
      await this.requestBrowserPermission();
      return;
    }

    try {
      // Request permission for local notifications
      const localPerm = await LocalNotifications.requestPermissions();
      if (localPerm.display === 'granted') {
        this.notificationsEnabled = true;
      }

      // Request permission for push notifications
      const pushPerm = await PushNotifications.requestPermissions();
      if (pushPerm.receive === 'granted') {
        await PushNotifications.register();
      }

      // Listen for push notification received
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push notification received:', notification);
      });

      // Listen for notification action
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Notification action performed:', notification);
        this.handleNotificationAction(notification.notification.data);
      });

    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  }

  private async requestBrowserPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      this.notificationsEnabled = permission === 'granted';
    }
  }

  private handleNotificationAction(data: any) {
    if (data.action) {
      // Handle different actions
      switch (data.action) {
        case 'open_copilot':
          window.location.hash = '#copilot';
          break;
        case 'set_limit':
          window.location.hash = '#limits';
          break;
        case 'view_transactions':
          window.location.hash = '#transactions';
          break;
      }
    }
  }

  async scheduleAlert(alert: FinancialAlert, when?: Date) {
    if (!this.notificationsEnabled) {
      console.warn('Notifications not enabled');
      return;
    }

    if (!this.isNative) {
      // Browser notification
      this.showBrowserNotification(alert);
      return;
    }

    const scheduleTime = when || new Date(Date.now() + 1000); // 1 second from now if immediate

    try {
      await LocalNotifications.schedule({
        notifications: [{
          id: this.generateNotificationId(),
          title: alert.title,
          body: alert.message,
          schedule: { at: scheduleTime },
          extra: {
            type: alert.type,
            action: alert.action,
            actionData: alert.actionData
          },
          actionTypeId: alert.action || 'default',
          sound: alert.type === 'critical' ? 'beep.wav' : undefined,
        }]
      });
    } catch (error) {
      console.error('Failed to schedule notification:', error);
    }
  }

  private showBrowserNotification(alert: FinancialAlert) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(alert.title, {
        body: alert.message,
        icon: '/icon-192.png',
        badge: '/icon-96.png',
        tag: alert.id,
        requireInteraction: alert.type === 'critical',
      });

      notification.onclick = () => {
        window.focus();
        if (alert.action) {
          this.handleNotificationAction({ action: alert.action });
        }
      };
    }
  }

  private generateNotificationId(): number {
    return Math.floor(Math.random() * 100000);
  }

  async cancelAll() {
    if (this.isNative) {
      await LocalNotifications.cancel({ notifications: [] });
    }
  }

  // Critical alerts - these trigger immediately
  async sendCriticalBalanceAlert(daysLeft: number, balance: number, dailySpending: number) {
    const alert: FinancialAlert = {
      id: 'critical_balance_' + Date.now(),
      type: 'critical',
      title: '🚨 Critical: Balance Alert',
      message: `Your balance will hit zero in ${daysLeft} days at current spending (${Math.round(dailySpending).toLocaleString()}/day). Take action NOW!`,
      action: 'open_copilot',
      timestamp: new Date(),
      priority: 5
    };
    await this.scheduleAlert(alert);
  }

  async sendStressSpendingAlert(count: number, total: number, timeframe: string) {
    const alert: FinancialAlert = {
      id: 'stress_spending_' + Date.now(),
      type: 'warning',
      title: '🌙 Late-Night Spending Detected',
      message: `${count} purchases after 9pm ${timeframe} (${total.toLocaleString()}). This is a stress spending pattern. Need help?`,
      action: 'open_copilot',
      timestamp: new Date(),
      priority: 4
    };
    await this.scheduleAlert(alert);
  }

  async sendBudgetExceededAlert(category: string, spent: number, limit: number) {
    const alert: FinancialAlert = {
      id: 'budget_exceeded_' + Date.now(),
      type: 'warning',
      title: '⚠️ Budget Exceeded',
      message: `${category}: ${spent.toLocaleString()}/${limit.toLocaleString()} (+${Math.round(((spent - limit) / limit) * 100)}%). Set new limit or reduce spending?`,
      action: 'set_limit',
      actionData: { category },
      timestamp: new Date(),
      priority: 3
    };
    await this.scheduleAlert(alert);
  }

  async sendAnomalyAlert(description: string, amount: number, category: string) {
    const alert: FinancialAlert = {
      id: 'anomaly_' + Date.now(),
      type: 'warning',
      title: '🚨 Unusual Activity',
      message: `${description}: ${amount.toLocaleString()} in ${category}. This is 10x your usual. Is everything OK?`,
      action: 'view_transactions',
      timestamp: new Date(),
      priority: 4
    };
    await this.scheduleAlert(alert);
  }

  async sendGoalMilestoneAlert(goalName: string, percent: number) {
    const alert: FinancialAlert = {
      id: 'goal_milestone_' + Date.now(),
      type: 'achievement',
      title: '🎉 Milestone Reached!',
      message: `${goalName}: ${percent}% complete! You're doing great! Keep it up! 💪`,
      timestamp: new Date(),
      priority: 2
    };
    await this.scheduleAlert(alert);
  }

  async sendWeeklySummary(spent: number, income: number, savings: number, trend: string) {
    const alert: FinancialAlert = {
      id: 'weekly_summary_' + Date.now(),
      type: 'info',
      title: '📊 Weekly Summary',
      message: `Spent: ${spent.toLocaleString()} | Income: ${income.toLocaleString()} | Saved: ${savings.toLocaleString()} | Trend: ${trend}`,
      action: 'open_copilot',
      timestamp: new Date(),
      priority: 2
    };
    await this.scheduleAlert(alert);
  }

  // Daily check (to be called by scheduler)
  async performDailyCheck(data: {
    balance: number;
    avgDailySpending: number;
    transactions: any[];
    limits: any[];
    goals: any[];
  }) {
    const { balance, avgDailySpending, transactions, limits, goals } = data;

    // Check 1: Critical balance
    const daysUntilZero = avgDailySpending > 0 ? Math.floor(balance / avgDailySpending) : 999;
    if (daysUntilZero <= 3 && daysUntilZero > 0) {
      await this.sendCriticalBalanceAlert(daysUntilZero, balance, avgDailySpending);
    }

    // Check 2: Late-night spending (last 24h)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const lateNightTx = transactions.filter(t => {
      if (!t.time || t.date < yesterday) return false;
      const hour = parseInt(t.time.split(':')[0]);
      return hour >= 21 || hour < 6;
    });

    if (lateNightTx.length >= 3) {
      const total = lateNightTx.reduce((s, t) => s + Math.abs(t.amount), 0);
      await this.sendStressSpendingAlert(lateNightTx.length, total, 'in the last 24 hours');
    }

    // Check 3: Budget exceeded
    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthTx = transactions.filter(t => t.date.startsWith(thisMonth) && t.amount < 0);
    
    for (const limit of limits) {
      const spent = monthTx
        .filter(t => t.categoryId === limit.categoryId)
        .reduce((s, t) => s + Math.abs(t.amount), 0);
      
      if (spent > limit.amount * 1.2) { // 20% over budget
        await this.sendBudgetExceededAlert(limit.categoryId, spent, limit.amount);
      }
    }

    // Check 4: Goal milestones
    for (const goal of goals) {
      const progress = (goal.current / goal.target) * 100;
      const milestones = [25, 50, 75, 90];
      
      for (const milestone of milestones) {
        const key = `goal_${goal.id}_${milestone}`;
        const notified = localStorage.getItem(key);
        
        if (progress >= milestone && !notified) {
          await this.sendGoalMilestoneAlert(goal.name, milestone);
          localStorage.setItem(key, 'true');
        }
      }
    }
  }
}

// Export singleton instance
export const notificationManager = NotificationManager.getInstance();
