import React, { useState, memo, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { formatUZS } from "@/lib/storage";
import { RecurringTransaction } from "@/types";
import { safeJSON, uid, todayISO } from "@/lib/storage";

// Recurring transactions stored locally
const RECURRING_KEY = "hamyon_recurring";

export const RecurringScreen: React.FC = () => {
  const { t, getCat, catLabel, addTransaction, showToast, allCats } = useApp();
  const [recurring, setRecurring] = useState<RecurringTransaction[]>(() => 
    safeJSON.get(RECURRING_KEY, [])
  );
  const [showAddModal, setShowAddModal] = useState(false);

  // Save to localStorage
  const saveRecurring = useCallback((items: RecurringTransaction[]) => {
    setRecurring(items);
    safeJSON.set(RECURRING_KEY, items);
  }, []);

  const handleDelete = useCallback((id: string) => {
    saveRecurring(recurring.filter((r) => r.id !== id));
    showToast("✓", true);
  }, [recurring, saveRecurring, showToast]);

  const handleToggle = useCallback((id: string) => {
    saveRecurring(
      recurring.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    );
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

    // Update next date based on frequency
    const nextDate = new Date(r.nextDate);
    switch (r.frequency) {
      case "daily": nextDate.setDate(nextDate.getDate() + 1); break;
      case "weekly": nextDate.setDate(nextDate.getDate() + 7); break;
      case "monthly": nextDate.setMonth(nextDate.getMonth() + 1); break;
      case "yearly": nextDate.setFullYear(nextDate.getFullYear() + 1); break;
    }
    
    saveRecurring(
      recurring.map((item) => 
        item.id === r.id ? { ...item, nextDate: nextDate.toISOString().slice(0, 10) } : item
      )
    );
  }, [addTransaction, recurring, saveRecurring]);

  const frequencyLabel = (freq: string) => {
    const labels: Record<string, Record<string, string>> = {
      daily: { uz: "Kunlik", ru: "Ежедневно", en: "Daily" },
      weekly: { uz: "Haftalik", ru: "Еженедельно", en: "Weekly" },
      monthly: { uz: "Oylik", ru: "Ежемесячно", en: "Monthly" },
      yearly: { uz: "Yillik", ru: "Ежегодно", en: "Yearly" },
    };
    return labels[freq]?.en || freq;
  };

  // Check for due recurring transactions
  const dueToday = useMemo(() => {
    const today = todayISO();
    return recurring.filter((r) => r.active && r.nextDate <= today);
  }, [recurring]);

  return (
    <div className="screen-container pb-32">
      {/* Header */}
      <div className="safe-top px-4 pt-4 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-title-1 text-foreground">{t.recurring || "Recurring"}</h1>
            <p className="text-sm text-muted-foreground">{t.subscriptions || "Subscriptions & bills"}</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddModal(true)}
            className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
          >
            <span className="text-xl">+</span>
          </motion.button>
        </div>
      </div>

      {/* Due Today Alert */}
      {dueToday.length > 0 && (
        <div className="px-4 mb-4">
          <div className="bg-expense/10 border border-expense/20 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xl">⚠️</span>
              <p className="font-semibold text-foreground">
                {dueToday.length} {t.dueToday || "due today"}
              </p>
            </div>
            <div className="space-y-2">
              {dueToday.map((r) => (
                <div key={r.id} className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{r.description}</span>
                  <button
                    onClick={() => handleExecute(r)}
                    className="px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full"
                  >
                    {t.execute || "Execute"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recurring List */}
      <div className="px-4 space-y-3">
        {recurring.length === 0 ? (
          <div className="card-elevated p-8 text-center">
            <span className="text-5xl block mb-3">🔄</span>
            <p className="text-muted-foreground mb-4">{t.noRecurring || "No recurring transactions"}</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary"
            >
              {t.add}
            </button>
          </div>
        ) : (
          recurring.map((r) => {
            const cat = getCat(r.categoryId);
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`glass-card p-4 transition-opacity ${!r.active ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${cat.color}20` }}
                  >
                    {r.emoji || cat.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{r.description}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{frequencyLabel(r.frequency)}</span>
                      <span>•</span>
                      <span>{t.next || "Next"}: {r.nextDate}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${r.type === "expense" ? "text-expense" : "text-income"}`}>
                      {r.type === "expense" ? "-" : "+"}{formatUZS(r.amount)}
                    </p>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                  <button
                    onClick={() => handleToggle(r.id)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                      r.active 
                        ? 'bg-secondary text-foreground' 
                        : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {r.active ? (t.pause || "Pause") : (t.resume || "Resume")}
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="px-4 py-2 rounded-lg bg-destructive/10 text-destructive text-sm font-medium"
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
  const { t, allCats, getCat, catLabel } = useApp();
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
    <AnimatePresence>
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
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="absolute bottom-0 left-0 right-0 modal-content safe-bottom max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-6" />
          
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-title-1 text-foreground">{t.addRecurring || "Add Recurring"}</h2>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
              ✕
            </button>
          </div>

          {/* Type */}
          <div className="flex gap-2 mb-4">
            {[
              { k: "expense" as const, label: t.expense, color: "expense" },
              { k: "income" as const, label: t.incomeType, color: "income" },
            ].map((x) => (
              <button
                key={x.k}
                onClick={() => {
                  setType(x.k);
                  setCategoryId(x.k === "expense" ? "bills" : "salary");
                }}
                className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                  type === x.k
                    ? x.k === "expense"
                      ? "bg-red-50 text-expense border-2 border-expense"
                      : "bg-green-50 text-income border-2 border-income"
                    : "bg-secondary text-muted-foreground border-2 border-transparent"
                }`}
              >
                {x.label}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div className="mb-4">
            <label className="text-caption text-muted-foreground font-medium mb-2 block">{t.amount}</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
              type="text"
              inputMode="numeric"
              className="input-clean text-2xl font-bold"
              placeholder="0"
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="text-caption text-muted-foreground font-medium mb-2 block">{t.description}</label>
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
            <label className="text-caption text-muted-foreground font-medium mb-2 block">{t.frequency || "Frequency"}</label>
            <div className="flex gap-2 flex-wrap">
              {(["daily", "weekly", "monthly", "yearly"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFrequency(f)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    frequency === f
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Next Date */}
          <div className="mb-4">
            <label className="text-caption text-muted-foreground font-medium mb-2 block">{t.next || "Next"} {t.date}</label>
            <input
              value={nextDate}
              onChange={(e) => setNextDate(e.target.value)}
              type="date"
              className="input-clean"
            />
          </div>

          {/* Category */}
          <div className="mb-6">
            <label className="text-caption text-muted-foreground font-medium mb-3 block">{t.category}</label>
            <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto no-scrollbar">
              {cats.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategoryId(c.id)}
                  className={`p-3 rounded-xl flex flex-col items-center gap-1.5 transition-all ${
                    categoryId === c.id
                      ? "bg-accent ring-2 ring-primary scale-105"
                      : "bg-secondary hover:bg-muted"
                  }`}
                >
                  <span className="text-xl">{c.emoji}</span>
                  <span className="text-2xs text-center truncate w-full text-muted-foreground">{catLabel(c)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">
              {t.cancel}
            </button>
            <button onClick={handleSave} className="btn-primary flex-1">
              {t.save}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

AddRecurringModal.displayName = "AddRecurringModal";

export default RecurringScreen;
