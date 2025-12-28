import React, { useState, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { Subscription } from "@/types";
import { safeJSON, uid } from "@/lib/storage";
import { formatCurrency } from "@/lib/exportData";
import { Plus, X, Bell, Calendar, CreditCard, Trash2, Edit2, Check, Tv, Music, Cloud, Gamepad2, Smartphone, Dumbbell, BookOpen, Film, Lock, Briefcase, ArrowLeft, Package } from "lucide-react";

// Subscription icon options using Lucide icons
const SUBSCRIPTION_ICONS = [
  { id: "tv", icon: Tv },
  { id: "music", icon: Music },
  { id: "cloud", icon: Cloud },
  { id: "gaming", icon: Gamepad2 },
  { id: "phone", icon: Smartphone },
  { id: "fitness", icon: Dumbbell },
  { id: "books", icon: BookOpen },
  { id: "streaming", icon: Film },
  { id: "security", icon: Lock },
  { id: "business", icon: Briefcase },
];

const SubscriptionIcon = memo(({ iconId, className }: { iconId: string; className?: string }) => {
  const iconDef = SUBSCRIPTION_ICONS.find(i => i.id === iconId);
  const IconComponent = iconDef?.icon || CreditCard;
  return <IconComponent className={className} />;
});
SubscriptionIcon.displayName = "SubscriptionIcon";

export const SubscriptionsScreen = memo(() => {
  const { lang, currency, showToast, setActiveScreen } = useApp();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() => 
    safeJSON.get("hamyon_subscriptions", [])
  );
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [nextBillingDate, setNextBillingDate] = useState(new Date().toISOString().slice(0, 10));
  const [iconId, setIconId] = useState("tv");
  const [reminderDays, setReminderDays] = useState(3);
  const [autoRenew, setAutoRenew] = useState(true);

  const t = {
    title: lang === "ru" ? "Подписки" : lang === "uz" ? "Obunalar" : "Subscriptions",
    addNew: lang === "ru" ? "Добавить" : lang === "uz" ? "Qo'shish" : "Add New",
    name: lang === "ru" ? "Название" : lang === "uz" ? "Nomi" : "Name",
    amount: lang === "ru" ? "Сумма" : lang === "uz" ? "Summa" : "Amount",
    frequency: lang === "ru" ? "Частота" : lang === "uz" ? "Chastotasi" : "Frequency",
    weekly: lang === "ru" ? "Еженедельно" : lang === "uz" ? "Haftalik" : "Weekly",
    monthly: lang === "ru" ? "Ежемесячно" : lang === "uz" ? "Oylik" : "Monthly",
    yearly: lang === "ru" ? "Ежегодно" : lang === "uz" ? "Yillik" : "Yearly",
    nextBilling: lang === "ru" ? "След. оплата" : lang === "uz" ? "Keyingi to'lov" : "Next Billing",
    reminder: lang === "ru" ? "Напоминание" : lang === "uz" ? "Eslatma" : "Reminder",
    daysBefore: lang === "ru" ? "дней до" : lang === "uz" ? "kun oldin" : "days before",
    save: lang === "ru" ? "Сохранить" : lang === "uz" ? "Saqlash" : "Save",
    cancel: lang === "ru" ? "Отмена" : lang === "uz" ? "Bekor" : "Cancel",
    noSubs: lang === "ru" ? "Нет подписок" : lang === "uz" ? "Obunalar yo'q" : "No subscriptions",
    total: lang === "ru" ? "Всего в месяц" : lang === "uz" ? "Jami oylik" : "Monthly Total",
    dueSoon: lang === "ru" ? "Скоро оплата" : lang === "uz" ? "Tez orada to'lov" : "Due Soon",
    active: lang === "ru" ? "Активные" : lang === "uz" ? "Faol" : "Active",
  };

  // Calculate monthly total
  const monthlyTotal = useMemo(() => {
    return subscriptions.filter(s => s.active).reduce((total, sub) => {
      if (sub.frequency === "weekly") return total + sub.amount * 4;
      if (sub.frequency === "yearly") return total + sub.amount / 12;
      return total + sub.amount;
    }, 0);
  }, [subscriptions]);

  // Subscriptions due soon (within 7 days)
  const dueSoon = useMemo(() => {
    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    return subscriptions.filter(s => s.active && s.nextBillingDate >= today && s.nextBillingDate <= weekFromNow);
  }, [subscriptions]);

  const resetForm = () => {
    setName("");
    setAmount("");
    setFrequency("monthly");
    setNextBillingDate(new Date().toISOString().slice(0, 10));
    setIconId("tv");
    setReminderDays(3);
    setAutoRenew(true);
    setEditingId(null);
  };

  const openEditForm = (sub: Subscription) => {
    setName(sub.name);
    setAmount(sub.amount.toString());
    setFrequency(sub.frequency);
    setNextBillingDate(sub.nextBillingDate);
    setIconId(sub.emoji || "tv");
    setReminderDays(sub.reminderDays);
    setAutoRenew(sub.autoRenew);
    setEditingId(sub.id);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!name.trim() || !amount) return;
    
    const subData: Subscription = {
      id: editingId || uid(),
      name: name.trim(),
      amount: parseFloat(amount),
      currency,
      frequency,
      nextBillingDate,
      category: "subscription",
      emoji: iconId,
      active: true,
      reminderDays,
      autoRenew,
    };

    if (editingId) {
      setSubscriptions(prev => {
        const updated = prev.map(s => s.id === editingId ? subData : s);
        safeJSON.set("hamyon_subscriptions", updated);
        return updated;
      });
    } else {
      setSubscriptions(prev => {
        const updated = [subData, ...prev];
        safeJSON.set("hamyon_subscriptions", updated);
        return updated;
      });
    }
    
    showToast("✓", true);
    setShowForm(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    setSubscriptions(prev => {
      const updated = prev.filter(s => s.id !== id);
      safeJSON.set("hamyon_subscriptions", updated);
      return updated;
    });
    showToast("✓", true);
  };

  const toggleActive = (id: string) => {
    setSubscriptions(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, active: !s.active } : s);
      safeJSON.set("hamyon_subscriptions", updated);
      return updated;
    });
  };

  const getDaysUntil = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="pb-24 px-4 pt-2 safe-top">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveScreen("home")} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">{t.title}</h1>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => { resetForm(); setShowForm(true); }}
          className="p-2 rounded-full bg-primary text-primary-foreground"
        >
          <Plus className="w-5 h-5" />
        </motion.button>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20"
        >
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">{t.total}</span>
          </div>
          <p className="text-xl font-bold text-foreground">
            {formatCurrency(monthlyTotal, currency)}
          </p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/20"
        >
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-5 h-5 text-amber-500" />
            <span className="text-sm text-muted-foreground">{t.dueSoon}</span>
          </div>
          <p className="text-xl font-bold text-foreground">{dueSoon.length}</p>
        </motion.div>
      </div>

      {/* Due Soon Section */}
      {dueSoon.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">{t.dueSoon}</h2>
          <div className="space-y-2">
            {dueSoon.map(sub => {
              const daysUntil = getDaysUntil(sub.nextBillingDate);
              return (
                <motion.div
                  key={sub.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <SubscriptionIcon iconId={sub.emoji} className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{sub.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {daysUntil === 0 ? (lang === "ru" ? "Сегодня" : lang === "uz" ? "Bugun" : "Today") :
                       daysUntil === 1 ? (lang === "ru" ? "Завтра" : lang === "uz" ? "Ertaga" : "Tomorrow") :
                       `${daysUntil} ${lang === "ru" ? "дней" : lang === "uz" ? "kun" : "days"}`}
                    </p>
                  </div>
                  <p className="font-bold text-foreground">{formatCurrency(sub.amount, sub.currency)}</p>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* All Subscriptions */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-3">{t.active}</h2>
        {subscriptions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-muted flex items-center justify-center">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <p>{t.noSubs}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {subscriptions.map((sub, index) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 rounded-xl border ${sub.active ? 'bg-card border-border' : 'bg-muted/50 border-border opacity-60'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <SubscriptionIcon iconId={sub.emoji} className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{sub.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{sub.nextBillingDate}</span>
                      <span>•</span>
                      <span>{sub.frequency === "weekly" ? t.weekly : sub.frequency === "yearly" ? t.yearly : t.monthly}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">{formatCurrency(sub.amount, sub.currency)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-border">
                  <button
                    onClick={() => toggleActive(sub.id)}
                    className={`p-2 rounded-lg ${sub.active ? 'bg-income/20 text-income' : 'bg-muted text-muted-foreground'}`}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => openEditForm(sub)} className="p-2 rounded-lg bg-secondary text-foreground">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(sub.id)} className="p-2 rounded-lg bg-destructive/20 text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Add/Edit Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              onClick={e => e.stopPropagation()}
              className="bg-background rounded-t-3xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">{editingId ? t.save : t.addNew}</h2>
                <button onClick={() => setShowForm(false)} className="p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Icon Picker */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Icon</label>
                  <div className="flex gap-2 flex-wrap">
                    {SUBSCRIPTION_ICONS.map(item => {
                      const IconComp = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setIconId(item.id)}
                          className={`p-3 rounded-xl ${iconId === item.id ? 'bg-primary/20 border-2 border-primary' : 'bg-secondary'}`}
                        >
                          <IconComp className={`w-6 h-6 ${iconId === item.id ? 'text-primary' : 'text-foreground'}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t.name}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Netflix, Spotify..."
                    className="w-full p-3 rounded-xl bg-secondary border border-border text-foreground"
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t.amount}</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0"
                    className="w-full p-3 rounded-xl bg-secondary border border-border text-foreground"
                  />
                </div>

                {/* Frequency */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t.frequency}</label>
                  <div className="flex gap-2">
                    {(["weekly", "monthly", "yearly"] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setFrequency(f)}
                        className={`flex-1 p-3 rounded-xl ${frequency === f ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
                      >
                        {f === "weekly" ? t.weekly : f === "yearly" ? t.yearly : t.monthly}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Next Billing Date */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t.nextBilling}</label>
                  <input
                    type="date"
                    value={nextBillingDate}
                    onChange={e => setNextBillingDate(e.target.value)}
                    className="w-full p-3 rounded-xl bg-secondary border border-border text-foreground"
                  />
                </div>

                {/* Reminder Days */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t.reminder}</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={reminderDays}
                      onChange={e => setReminderDays(parseInt(e.target.value) || 0)}
                      className="w-20 p-3 rounded-xl bg-secondary border border-border text-foreground text-center"
                    />
                    <span className="text-muted-foreground">{t.daysBefore}</span>
                  </div>
                </div>

                {/* Save Button */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  disabled={!name.trim() || !amount}
                  className="w-full p-4 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-50"
                >
                  {t.save}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default SubscriptionsScreen;
