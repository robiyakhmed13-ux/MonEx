import React, { useState, memo, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { formatUZS } from "@/lib/storage";
import { RecurringTransaction } from "@/types";
import { safeJSON, uid, todayISO } from "@/lib/storage";
import { ArrowLeft, Plus, AlertTriangle, X } from "lucide-react";

const RECURRING_KEY = "hamyon_recurring";

export const RecurringScreen: React.FC = () => {
  const { t, getCat, catLabel, addTransaction, showToast, allCats, setActiveScreen, lang } = useApp();
  const [recurring, setRecurring] = useState<RecurringTransaction[]>(() => safeJSON.get(RECURRING_KEY, []));
  const [showAddModal, setShowAddModal] = useState(false);

  const saveRecurring = useCallback((items: RecurringTransaction[]) => {
    setRecurring(items);
    safeJSON.set(RECURRING_KEY, items);
  }, []);

  const handleDelete = useCallback((id: string) => {
    saveRecurring(recurring.filter((r) => r.id !== id));
    showToast("✓", true);
  }, [recurring, saveRecurring, showToast]);

  const handleToggle = useCallback((id: string) => {
    saveRecurring(recurring.map((r) => (r.id === id ? { ...r, active: !r.active } : r)));
  }, [recurring, saveRecurring]);

  const handleExecute = useCallback(async (r: RecurringTransaction) => {
    const now = new Date();
    await addTransaction({
      type: r.type,
      amount: r.type === "expense" ? -Math.abs(r.amount) : Math.abs(r.amount),
      categoryId: r.categoryId,
      description: r.description,
      date: todayISO(),
      time: now.toISOString().slice(11, 16),
      source: "recurring",
      recurringId: r.id,
    });

    const nextDate = new Date(r.nextDate);
    switch (r.frequency) {
      case "daily": nextDate.setDate(nextDate.getDate() + 1); break;
      case "weekly": nextDate.setDate(nextDate.getDate() + 7); break;
      case "monthly": nextDate.setMonth(nextDate.getMonth() + 1); break;
      case "yearly": nextDate.setFullYear(nextDate.getFullYear() + 1); break;
    }
    
    saveRecurring(recurring.map((item) => item.id === r.id ? { ...item, nextDate: nextDate.toISOString().slice(0, 10) } : item));
    showToast("✓", true);
  }, [addTransaction, recurring, saveRecurring, showToast]);

  const frequencyLabel = (freq: string) => {
    const labels: Record<string, Record<string, string>> = {
      daily: { uz: "Kunlik", ru: "Ежедневно", en: "Daily" },
      weekly: { uz: "Haftalik", ru: "Еженедельно", en: "Weekly" },
      monthly: { uz: "Oylik", ru: "Ежемесячно", en: "Monthly" },
      yearly: { uz: "Yillik", ru: "Ежегодно", en: "Yearly" },
    };
    return labels[freq]?.[lang] || labels[freq]?.en || freq;
  };

  const dueToday = useMemo(() => {
    const today = todayISO();
    return recurring.filter((r) => r.active && r.nextDate <= today);
  }, [recurring]);

  const labels = {
    title: lang === "uz" ? "Takroriy" : lang === "ru" ? "Повторяющиеся" : "Recurring",
    subtitle: lang === "uz" ? "Obunalar va to'lovlar" : lang === "ru" ? "Подписки и платежи" : "Subscriptions & bills",
    dueToday: lang === "uz" ? "bugun to'lanadi" : lang === "ru" ? "сегодня к оплате" : "due today",
    execute: lang === "uz" ? "Bajarish" : lang === "ru" ? "Выполнить" : "Execute",
    noRecurring: lang === "uz" ? "Takroriy tranzaksiyalar yo'q" : lang === "ru" ? "Нет повторяющихся" : "No recurring",
    pause: lang === "uz" ? "To'xtatish" : lang === "ru" ? "Пауза" : "Pause",
    resume: lang === "uz" ? "Davom" : lang === "ru" ? "Возобновить" : "Resume",
    next: lang === "uz" ? "Keyingi" : lang === "ru" ? "Следующий" : "Next",
  };

  return (
    <div className="screen-container">
      {/* Large Title */}
      <header className="screen-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveScreen("home")}
              className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center active:opacity-70"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div>
              <h1 className="text-large-title text-foreground">{labels.title}</h1>
              <p className="text-caption">{labels.subtitle}</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:opacity-70"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Due Today Alert (Insight Card with action) */}
      {dueToday.length > 0 && (
        <div className="card-action mb-6 bg-destructive/10">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <p className="text-body-medium text-foreground">
              {dueToday.length} {labels.dueToday}
            </p>
          </div>
          <div className="space-y-2">
            {dueToday.map((r) => (
              <div key={r.id} className="flex items-center justify-between">
                <span className="text-body text-foreground">{r.description}</span>
                <button
                  onClick={() => handleExecute(r)}
                  className="btn-primary text-caption py-1.5 px-3"
                >
                  {labels.execute}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recurring List */}
      <div className="space-y-3">
        {recurring.length === 0 ? (
          <div className="card-info text-center py-12">
            <span className="text-5xl block mb-4">🔄</span>
            <p className="text-body text-muted-foreground mb-4">{labels.noRecurring}</p>
            <button onClick={() => setShowAddModal(true)} className="btn-primary">
              {t.add}
            </button>
          </div>
        ) : (
          recurring.map((r, index) => {
            const cat = getCat(r.categoryId);
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.2 }}
                className={`card-info ${!r.active ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center gap-4 mb-3">
                  <div
                    className="category-icon text-2xl"
                    style={{ backgroundColor: `${cat.color}15` }}
                  >
                    {r.emoji || cat.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-body-medium text-foreground truncate">{r.description}</h3>
                    <p className="text-caption">
                      {frequencyLabel(r.frequency)} • {labels.next}: {r.nextDate}
                    </p>
                  </div>
                  <p className={`text-body-medium ${r.type === "expense" ? "amount-expense" : "amount-income"}`}>
                    {r.type === "expense" ? "-" : "+"}{formatUZS(r.amount)}
                  </p>
                </div>
                
                <div className="flex gap-2 pt-3 border-t border-border">
                  <button
                    onClick={() => handleToggle(r.id)}
                    className={`flex-1 py-2 rounded-xl text-body-medium active:opacity-70 ${
                      r.active ? 'bg-secondary text-foreground' : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {r.active ? labels.pause : labels.resume}
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="flex-1 py-2 rounded-xl bg-destructive/10 text-destructive text-body-medium active:opacity-70"
                  >
                    {t.delete}
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Add Modal */}
      <AddRecurringModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={(r) => {
          saveRecurring([...recurring, r]);
          setShowAddModal(false);
        }}
      />
    </div>
  );
};

interface AddRecurringModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (r: RecurringTransaction) => void;
}

const AddRecurringModal = memo(({ isOpen, onClose, onSave }: AddRecurringModalProps) => {
  const { t, allCats, getCat, catLabel, lang } = useApp();
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("bills");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [nextDate, setNextDate] = useState(todayISO());

  const cats = type === "expense" ? allCats.expense : allCats.income;

  const handleSave = () => {
    if (!amount || !description) return;
    const cat = getCat(categoryId);
    onSave({
      id: uid(),
      type,
      amount: parseInt(amount),
      description,
      categoryId,
      frequency,
      nextDate,
      active: true,
      emoji: cat.emoji,
    });
    setAmount("");
    setDescription("");
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="modal-overlay"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ duration: 0.25 }}
        className="absolute bottom-0 left-0 right-0 modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-6" />
        
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-title text-foreground">{t.add}</h2>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center active:opacity-70">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Type */}
        <div className="flex gap-2 mb-4">
          {[
            { k: "expense" as const, label: t.expense },
            { k: "income" as const, label: t.incomeType },
          ].map((x) => (
            <button
              key={x.k}
              onClick={() => {
                setType(x.k);
                setCategoryId(x.k === "expense" ? "bills" : "salary");
              }}
              className={`flex-1 py-3 rounded-xl text-body-medium active:opacity-70 ${
                type === x.k
                  ? x.k === "expense"
                    ? "bg-destructive/10 text-destructive ring-2 ring-destructive"
                    : "bg-[hsl(var(--income))]/10 text-[hsl(var(--income))] ring-2 ring-[hsl(var(--income))]"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>

        {/* Amount */}
        <div className="mb-4">
          <label className="text-caption mb-2 block">{t.amount}</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
            type="text"
            inputMode="numeric"
            className="input-clean text-display"
            placeholder="0"
          />
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="text-caption mb-2 block">{t.description}</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            type="text"
            className="input-clean"
            placeholder="e.g. Netflix, Rent..."
          />
        </div>

        {/* Frequency */}
        <div className="mb-4">
          <label className="text-caption mb-2 block">{lang === "uz" ? "Chastota" : lang === "ru" ? "Частота" : "Frequency"}</label>
          <div className="flex gap-2 flex-wrap">
            {(["daily", "weekly", "monthly", "yearly"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFrequency(f)}
                className={`px-4 py-2 rounded-xl text-caption active:opacity-70 ${
                  frequency === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Next Date */}
        <div className="mb-4">
          <label className="text-caption mb-2 block">{lang === "uz" ? "Keyingi sana" : lang === "ru" ? "Следующая дата" : "Next date"}</label>
          <input
            value={nextDate}
            onChange={(e) => setNextDate(e.target.value)}
            type="date"
            className="input-clean"
          />
        </div>

        {/* Category */}
        <div className="mb-6">
          <label className="text-caption mb-2 block">{t.category}</label>
          <div className="grid grid-cols-4 gap-2 max-h-28 overflow-y-auto no-scrollbar">
            {cats.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoryId(c.id)}
                className={`p-3 rounded-xl flex flex-col items-center gap-1 active:opacity-70 ${
                  categoryId === c.id ? "bg-primary/10 ring-2 ring-primary" : "bg-secondary"
                }`}
              >
                <span className="text-xl">{c.emoji}</span>
                <span className="text-caption text-center truncate w-full">{catLabel(c)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">{t.cancel}</button>
          <button onClick={handleSave} className="btn-primary flex-1">{t.save}</button>
        </div>
      </motion.div>
    </motion.div>
  );
});

AddRecurringModal.displayName = "AddRecurringModal";

export default RecurringScreen;