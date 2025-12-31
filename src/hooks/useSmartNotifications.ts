import { useState, useEffect, useCallback, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { SmartNotification, Subscription, RecurringTransaction } from "@/types";
import { safeJSON, uid } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";

export const useSmartNotifications = () => {
  const { 
    tgUser,
    transactions, limits, goals, monthSpentByCategory, getCat, catLabel, lang, t, currency,
    weekSpend, monthSpend, reminderDays
  } = useApp();
  
  const [notifications, setNotifications] = useState<SmartNotification[]>(() => 
    safeJSON.get("hamyon_notifications", [])
  );
  
  // Get subscriptions and recurring transactions - read inside effects to avoid hook ordering issues
  const getSubscriptions = useCallback(() => safeJSON.get<Subscription[]>("hamyon_subscriptions", []), []);
  const getRecurring = useCallback(() => safeJSON.get<RecurringTransaction[]>("hamyon_recurring", []), []);
  
  // Save notifications to storage
  useEffect(() => {
    safeJSON.set("hamyon_notifications", notifications);
  }, [notifications]);

  // Add notification helper
  const addNotification = useCallback((notif: Omit<SmartNotification, "id" | "createdAt" | "read">) => {
    const newNotif: SmartNotification = {
      ...notif,
      id: uid(),
      createdAt: new Date().toISOString(),
      read: false,
    };
    setNotifications(prev => {
      // Avoid duplicate notifications (same type and message within last hour)
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const isDuplicate = prev.some(n => 
        n.type === notif.type && 
        n.message === notif.message && 
        n.createdAt > hourAgo
      );
      if (isDuplicate) return prev;
      return [newNotif, ...prev].slice(0, 50); // Keep last 50 notifications
    });
  }, []);

  // Realtime: notify about new Telegram transactions
  useEffect(() => {
    if (!tgUser?.id) return;

    const channel = supabase
      .channel(`telegram_tx_${tgUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "telegram_transactions",
          filter: `telegram_user_id=eq.${tgUser.id}`,
        },
        (payload) => {
          const row: any = (payload as any).new;
          if (!row) return;

          const amount = Number(row.amount || 0);
          const cat = getCat(row.category_id);
          const title =
            lang === "ru"
              ? "Новая транзакция из Telegram"
              : lang === "uz"
                ? "Telegramdan yangi tranzaksiya"
                : "New Telegram transaction";

          const formattedAmount = Math.abs(amount).toLocaleString(lang === "ru" ? "ru-RU" : lang === "uz" ? "uz-UZ" : "en-US");
          const direction = amount < 0
            ? (lang === "ru" ? "Расход" : lang === "uz" ? "Xarajat" : "Expense")
            : (lang === "ru" ? "Доход" : lang === "uz" ? "Daromad" : "Income");

          addNotification({
            type: "anomaly",
            title,
            message: `${cat.emoji} ${direction}: ${catLabel(cat)} • ${formattedAmount} ${row.currency || currency}`,
            severity: "info",
            actionType: "view_transaction",
            actionData: row.id,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tgUser?.id, lang, currency, getCat, catLabel, addNotification]);
  
  // Mark notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);
  
  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);
  
  // Check budget limits
  useEffect(() => {
    limits.forEach(limit => {
      const spent = monthSpentByCategory(limit.categoryId);
      const percentage = limit.amount > 0 ? (spent / limit.amount) * 100 : 0;
      const cat = getCat(limit.categoryId);
      const categoryName = catLabel(cat);
      
      if (percentage >= 100) {
        addNotification({
          type: "budget_alert",
          title: lang === "ru" ? "Бюджет превышен!" : lang === "uz" ? "Byudjet oshib ketdi!" : "Budget Exceeded!",
          message: lang === "ru" 
            ? `${cat.emoji} ${categoryName}: потрачено ${percentage.toFixed(0)}% от лимита`
            : lang === "uz"
            ? `${cat.emoji} ${categoryName}: limitning ${percentage.toFixed(0)}% sarflangan`
            : `${cat.emoji} ${categoryName}: spent ${percentage.toFixed(0)}% of limit`,
          severity: "critical",
          actionType: "view_limit",
          actionData: limit.id,
        });
      } else if (percentage >= 80) {
        addNotification({
          type: "budget_alert",
          title: lang === "ru" ? "Приближение к лимиту" : lang === "uz" ? "Limitga yaqinlashmoqda" : "Approaching Limit",
          message: lang === "ru" 
            ? `${cat.emoji} ${categoryName}: ${percentage.toFixed(0)}% использовано`
            : lang === "uz"
            ? `${cat.emoji} ${categoryName}: ${percentage.toFixed(0)}% ishlatildi`
            : `${cat.emoji} ${categoryName}: ${percentage.toFixed(0)}% used`,
          severity: "warning",
          actionType: "view_limit",
          actionData: limit.id,
        });
      }
    });
  }, [limits, monthSpentByCategory, getCat, catLabel, lang, addNotification]);
  
  // Detect spending anomalies
  useEffect(() => {
    if (transactions.length < 5) return;
    
    // Calculate average transaction amount for expenses
    const expenses = transactions.filter(tx => tx.amount < 0);
    if (expenses.length < 5) return;
    
    const amounts = expenses.slice(0, 20).map(tx => Math.abs(tx.amount));
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(amounts.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b, 0) / amounts.length);
    
    // Check last transaction for anomaly
    const lastExpense = expenses[0];
    if (lastExpense && Math.abs(lastExpense.amount) > avg + 2 * stdDev) {
      const cat = getCat(lastExpense.categoryId);
      addNotification({
        type: "anomaly",
        title: lang === "ru" ? "Необычный расход" : lang === "uz" ? "G'ayrioddiy xarajat" : "Unusual Spending",
        message: lang === "ru" 
          ? `${cat.emoji} ${lastExpense.description || catLabel(cat)} значительно выше обычного`
          : lang === "uz"
          ? `${cat.emoji} ${lastExpense.description || catLabel(cat)} odatdagidan ancha yuqori`
          : `${cat.emoji} ${lastExpense.description || catLabel(cat)} is significantly higher than usual`,
        severity: "warning",
        actionType: "view_transaction",
        actionData: lastExpense.id,
      });
    }
  }, [transactions, getCat, catLabel, lang, addNotification]);
  
  // Check goal progress
  useEffect(() => {
    goals.forEach(goal => {
      const percentage = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
      
      if (percentage >= 100) {
        addNotification({
          type: "goal_progress",
          title: lang === "ru" ? "Цель достигнута! 🎉" : lang === "uz" ? "Maqsadga erishildi! 🎉" : "Goal Achieved! 🎉",
          message: `${goal.emoji} ${goal.name}`,
          severity: "info",
          actionType: "view_goal",
          actionData: goal.id,
        });
      } else if (percentage >= 90) {
        addNotification({
          type: "goal_progress",
          title: lang === "ru" ? "Почти у цели!" : lang === "uz" ? "Maqsadga yaqin!" : "Almost There!",
          message: lang === "ru" 
            ? `${goal.emoji} ${goal.name}: ${percentage.toFixed(0)}% достигнуто`
            : lang === "uz"
            ? `${goal.emoji} ${goal.name}: ${percentage.toFixed(0)}% erishildi`
            : `${goal.emoji} ${goal.name}: ${percentage.toFixed(0)}% achieved`,
          severity: "info",
          actionType: "view_goal",
          actionData: goal.id,
        });
      }
    });
  }, [goals, lang, addNotification]);
  
  // Check subscription reminders (bills due within reminderDays)
  useEffect(() => {
    const today = new Date();
    const subscriptions = getSubscriptions();
    
    subscriptions.filter(sub => sub.active).forEach(sub => {
      const nextBilling = new Date(sub.nextBillingDate);
      const daysUntil = Math.ceil((nextBilling.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // Check if within reminder window (use global setting or subscription-specific)
      const effectiveReminderDays = sub.reminderDays || reminderDays;
      
      if (daysUntil >= 0 && daysUntil <= effectiveReminderDays) {
        const daysText = daysUntil === 0 
          ? (lang === "ru" ? "сегодня" : lang === "uz" ? "bugun" : "today")
          : daysUntil === 1 
          ? (lang === "ru" ? "завтра" : lang === "uz" ? "ertaga" : "tomorrow")
          : `${daysUntil} ${lang === "ru" ? "дней" : lang === "uz" ? "kun" : "days"}`;
        
        addNotification({
          type: "subscription_reminder",
          title: lang === "ru" ? "Напоминание о подписке" : lang === "uz" ? "Obuna eslatmasi" : "Subscription Reminder",
          message: lang === "ru" 
            ? `${sub.emoji} ${sub.name} — оплата ${daysText}`
            : lang === "uz"
            ? `${sub.emoji} ${sub.name} — to'lov ${daysText}`
            : `${sub.emoji} ${sub.name} — payment ${daysText}`,
          severity: daysUntil === 0 ? "critical" : "warning",
          actionType: "view_subscription",
          actionData: sub.id,
        });
      }
    });
  }, [getSubscriptions, lang, addNotification, reminderDays]);
  
  // Check recurring bill reminders
  useEffect(() => {
    const today = new Date();
    const recurring = getRecurring();
    
    recurring.filter(rec => rec.active && rec.type === "expense").forEach(rec => {
      const nextDate = new Date(rec.nextDate);
      const daysUntil = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // Use global reminder days setting
      if (daysUntil >= 0 && daysUntil <= reminderDays) {
        const daysText = daysUntil === 0 
          ? (lang === "ru" ? "сегодня" : lang === "uz" ? "bugun" : "today")
          : daysUntil === 1 
          ? (lang === "ru" ? "завтра" : lang === "uz" ? "ertaga" : "tomorrow")
          : `${daysUntil} ${lang === "ru" ? "дней" : lang === "uz" ? "kun" : "days"}`;
        
        const cat = getCat(rec.categoryId);
        
        addNotification({
          type: "bill_reminder",
          title: lang === "ru" ? "Напоминание о счёте" : lang === "uz" ? "Hisob eslatmasi" : "Bill Reminder",
          message: lang === "ru" 
            ? `${rec.emoji || cat.emoji} ${rec.description} — ${daysText}`
            : lang === "uz"
            ? `${rec.emoji || cat.emoji} ${rec.description} — ${daysText}`
            : `${rec.emoji || cat.emoji} ${rec.description} — ${daysText}`,
          severity: daysUntil === 0 ? "critical" : "warning",
          actionType: "view_transaction",
          actionData: rec.id,
        });
      }
    });
  }, [getRecurring, lang, getCat, addNotification, reminderDays]);
  
  // Unread count
  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);
  
  return {
    notifications,
    unreadCount,
    markAsRead,
    clearAll,
    addNotification,
  };
};
