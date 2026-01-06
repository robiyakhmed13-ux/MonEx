// Real-time sync between MonEX app and Telegram bot
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { Transaction } from '@/types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;

export class TelegramSync {
  private supabase: ReturnType<typeof createClient>;
  private channel: RealtimeChannel | null = null;
  private telegramId: number | null = null;
  private onTransactionAdded?: (transaction: Transaction) => void;
  private onTransactionUpdated?: (transaction: Transaction) => void;
  private onTransactionDeleted?: (id: string) => void;

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  }

  // Link user's Telegram account
  async linkTelegramAccount(telegramId: number, telegramUsername?: string) {
    this.telegramId = telegramId;
    
    // Save to local storage
    localStorage.setItem('telegram_id', telegramId.toString());
    if (telegramUsername) {
      localStorage.setItem('telegram_username', telegramUsername);
    }

    // Subscribe to real-time updates
    this.subscribeToChanges();

    return { success: true, telegramId };
  }

  // Get linked Telegram ID from storage
  getLinkedTelegramId(): number | null {
    const stored = localStorage.getItem('telegram_id');
    return stored ? parseInt(stored) : null;
  }

  // Check if Telegram is linked
  isLinked(): boolean {
    return this.getLinkedTelegramId() !== null;
  }

  // Unlink Telegram account
  unlinkTelegramAccount() {
    this.telegramId = null;
    localStorage.removeItem('telegram_id');
    localStorage.removeItem('telegram_username');
    
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
  }

  // Subscribe to real-time transaction changes from Telegram bot
  subscribeToChanges() {
    const telegramId = this.telegramId || this.getLinkedTelegramId();
    if (!telegramId) return;

    // Unsubscribe from previous channel
    if (this.channel) {
      this.channel.unsubscribe();
    }

    // Create new channel
    this.channel = this.supabase
      .channel(`telegram_sync_${telegramId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'telegram_transactions',
          filter: `telegram_user_id=eq.${telegramId}`
        },
        (payload) => {
          console.log('Transaction added via Telegram:', payload);
          if (this.onTransactionAdded && payload.new) {
            // Map telegram_transactions to Transaction format
            const tx = payload.new as any;
            this.onTransactionAdded({
              id: tx.id,
              amount: tx.amount,
              categoryId: tx.category_id,
              date: tx.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
              description: tx.description,
              type: tx.type,
            } as Transaction);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'telegram_transactions',
          filter: `telegram_user_id=eq.${telegramId}`
        },
        (payload) => {
          console.log('Transaction updated via Telegram:', payload);
          if (this.onTransactionUpdated && payload.new) {
            const tx = payload.new as any;
            this.onTransactionUpdated({
              id: tx.id,
              amount: tx.amount,
              categoryId: tx.category_id,
              date: tx.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
              description: tx.description,
              type: tx.type,
            } as Transaction);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'telegram_transactions',
          filter: `telegram_user_id=eq.${telegramId}`
        },
        (payload) => {
          console.log('Transaction deleted via Telegram:', payload);
          if (this.onTransactionDeleted && payload.old) {
            this.onTransactionDeleted((payload.old as any).id);
          }
        }
      )
      .subscribe();
  }

  // Set callback for when transaction is added via Telegram
  onTransactionAddedFromTelegram(callback: (transaction: Transaction) => void) {
    this.onTransactionAdded = callback;
  }

  // Set callback for when transaction is updated via Telegram
  onTransactionUpdatedFromTelegram(callback: (transaction: Transaction) => void) {
    this.onTransactionUpdated = callback;
  }

  // Set callback for when transaction is deleted via Telegram
  onTransactionDeletedFromTelegram(callback: (id: string) => void) {
    this.onTransactionDeleted = callback;
  }

  // Send notification to Telegram when transaction is added in app
  async notifyTelegramOfTransaction(transaction: Transaction, action: 'added' | 'updated' | 'deleted') {
    const telegramId = this.getLinkedTelegramId();
    if (!telegramId) return;

    let message = '';
    
    if (action === 'added') {
      message = `✅ Transaction added in app:

${transaction.description || transaction.categoryId}
${this.formatAmount(transaction.amount)} UZS
📅 ${transaction.date}

💰 Updated balance available in bot`;
    } else if (action === 'updated') {
      message = `✏️ Transaction updated in app:

${transaction.description || transaction.categoryId}
${this.formatAmount(transaction.amount)} UZS`;
    } else if (action === 'deleted') {
      message = `❌ Transaction deleted in app:

${transaction.description || transaction.categoryId}
${this.formatAmount(transaction.amount)} UZS`;
    }

    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramId,
          text: message
        })
      });
    } catch (error) {
      console.error('Failed to send Telegram notification:', error);
    }
  }

  // Send daily summary to Telegram
  async sendDailySummary(data: {
    spent: number;
    income: number;
    balance: number;
    topCategory: { name: string; amount: number };
    transactionCount: number;
  }) {
    const telegramId = this.getLinkedTelegramId();
    if (!telegramId) return;

    const message = `📊 Daily Summary

💸 Spent: ${this.formatAmount(Math.abs(data.spent))} UZS
💰 Income: ${this.formatAmount(data.income)} UZS
💵 Balance: ${this.formatAmount(data.balance)} UZS

📈 Top category: ${data.topCategory.name} (${this.formatAmount(data.topCategory.amount)})
📝 Transactions: ${data.transactionCount}

Open MonEX app for details`;

    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramId,
          text: message
        })
      });
    } catch (error) {
      console.error('Failed to send daily summary:', error);
    }
  }

  // Send budget alert to Telegram
  async sendBudgetAlert(categoryName: string, spent: number, limit: number, percentUsed: number) {
    const telegramId = this.getLinkedTelegramId();
    if (!telegramId) return;

    const emoji = percentUsed >= 100 ? '🔴' : percentUsed >= 80 ? '🟡' : '🟢';
    
    const message = `${emoji} Budget Alert

Category: ${categoryName}
Spent: ${this.formatAmount(spent)} UZS
Limit: ${this.formatAmount(limit)} UZS
Used: ${Math.round(percentUsed)}%

${percentUsed >= 100 ? '⚠️ Budget exceeded!' : percentUsed >= 80 ? '⚠️ Getting close to limit' : '✅ Still within budget'}`;

    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramId,
          text: message
        })
      });
    } catch (error) {
      console.error('Failed to send budget alert:', error);
    }
  }

  // Send goal achievement to Telegram
  async sendGoalAchievement(goalName: string, targetAmount: number, achievedAmount: number, percentComplete: number) {
    const telegramId = this.getLinkedTelegramId();
    if (!telegramId) return;

    const milestone = percentComplete >= 100 ? '🎉' : 
                     percentComplete >= 75 ? '🏆' : 
                     percentComplete >= 50 ? '🎯' : 
                     percentComplete >= 25 ? '⭐' : '🎪';

    const message = `${milestone} Goal Progress

${goalName}
${this.formatAmount(achievedAmount)} / ${this.formatAmount(targetAmount)} UZS
${Math.round(percentComplete)}% complete

${percentComplete >= 100 ? '🎉 Goal achieved! Congratulations!' : `Keep going! ${100 - Math.round(percentComplete)}% to go!`}`;

    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramId,
          text: message
        })
      });
    } catch (error) {
      console.error('Failed to send goal achievement:', error);
    }
  }

  // Generate deep link for Telegram bot
  getTelegramBotLink(): string {
    const botUsername = 'hamyon_uz_aibot'; // Your actual bot
    return `https://t.me/${botUsername}`;
  }

  // Generate linking QR code URL
  getLinkingQRCodeUrl(linkCode: string): string {
    const botUsername = 'hamyon_uz_aibot';
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://t.me/${botUsername}?start=${linkCode}`;
  }

  // Format amount with commas
  private formatAmount(amount: number): string {
    return new Intl.NumberFormat('en-US').format(Math.round(Math.abs(amount)));
  }

  // Clean up
  disconnect() {
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
  }
}

// Export singleton instance
export const telegramSync = new TelegramSync();
