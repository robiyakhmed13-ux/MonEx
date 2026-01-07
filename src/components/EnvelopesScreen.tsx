import React, { useState, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { BudgetEnvelope } from "@/types";
import { safeJSON, uid } from "@/lib/storage";
import { formatCurrency } from "@/lib/exportData";
import { Plus, X, Wallet, Trash2, Edit2 } from "lucide-react";

const ENVELOPE_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", 
  "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1"
];

const ENVELOPE_EMOJIS = ["🏠", "🍔", "🚗", "🎬", "🛒", "💊", "✈️", "📚", "💰", "🎁"];

export const EnvelopesScreen = memo(() => {
  const { lang, currency, showToast, setActiveScreen, transactions, allCats, catLabel, getCat } = useApp();
  const [envelopes, setEnvelopes] = useState<BudgetEnvelope[]>(() => 
    safeJSON.get("hamyon_envelopes", [])
  );
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("💰");
  const [allocated, setAllocated] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [color, setColor] = useState(ENVELOPE_COLORS[0]);
  const [period, setPeriod] = useState<"weekly" | "monthly">("monthly");

  const t = {
    title: lang === "ru" ? "Конверты бюджета" : lang === "uz" ? "Byudjet konvertlari" : "Budget Envelopes",
    addNew: lang === "ru" ? "Новый конверт" : lang === "uz" ? "Yangi konvert" : "New Envelope",
    name: lang === "ru" ? "Название" : lang === "uz" ? "Nomi" : "Name",
    allocated: lang === "ru" ? "Выделено" : lang === "uz" ? "Ajratilgan" : "Allocated",
    spent: lang === "ru" ? "Потрачено" : lang === "uz" ? "Sarflangan" : "Spent",
    remaining: lang === "ru" ? "Осталось" : lang === "uz" ? "Qoldi" : "Remaining",
    categories: lang === "ru" ? "Категории" : lang === "uz" ? "Kategoriyalar" : "Categories",
    period: lang === "ru" ? "Период" : lang === "uz" ? "Davr" : "Period",
    weekly: lang === "ru" ? "Неделя" : lang === "uz" ? "Haftalik" : "Weekly",
    monthly: lang === "ru" ? "Месяц" : lang === "uz" ? "Oylik" : "Monthly",
    save: lang === "ru" ? "Сохранить" : lang === "uz" ? "Saqlash" : "Save",
    noEnvelopes: lang === "ru" ? "Нет конвертов" : lang === "uz" ? "Konvertlar yo'q" : "No envelopes",
    totalAllocated: lang === "ru" ? "Всего выделено" : lang === "uz" ? "Jami ajratilgan" : "Total Allocated",
    totalSpent: lang === "ru" ? "Всего потрачено" : lang === "uz" ? "Jami sarflangan" : "Total Spent",
  };

  // Calculate spending for each envelope
  const envelopesWithSpending = useMemo(() => {
    const today = new Date();
    const startOfPeriod = (p: "weekly" | "monthly") => {
      if (p === "weekly") {
        const start = new Date(today);
        start.setDate(today.getDate() - today.getDay());
        return start.toISOString().slice(0, 10);
      } else {
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
      }
    };

    return envelopes.map(env => {
      const periodStart = startOfPeriod(env.period);
      const spent = transactions
        .filter(tx => 
          tx.amount < 0 && 
          tx.date >= periodStart &&
          env.categoryIds.includes(tx.categoryId)
        )
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
      
      return { ...env, spent };
    });
  }, [envelopes, transactions]);

  // Totals
  const totals = useMemo(() => {
    return envelopesWithSpending.reduce((acc, env) => ({
      allocated: acc.allocated + env.allocated,
      spent: acc.spent + env.spent,
    }), { allocated: 0, spent: 0 });
  }, [envelopesWithSpending]);

  const resetForm = () => {
    setName("");
    setEmoji("💰");
    setAllocated("");
    setSelectedCategories([]);
    setColor(ENVELOPE_COLORS[0]);
    setPeriod("monthly");
    setEditingId(null);
  };

  const openEditForm = (env: BudgetEnvelope) => {
    setName(env.name);
    setEmoji(env.emoji);
    setAllocated(env.allocated.toString());
    setSelectedCategories(env.categoryIds);
    setColor(env.color);
    setPeriod(env.period);
    setEditingId(env.id);
    setShowForm(true);
  };

  const toggleCategory = (catId: string) => {
    setSelectedCategories(prev => 
      prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
    );
  };

  const handleSave = () => {
    if (!name.trim() || !allocated || selectedCategories.length === 0) return;

    const envelopeData: BudgetEnvelope = {
      id: editingId || uid(),
      name: name.trim(),
      emoji,
      allocated: parseFloat(allocated),
      spent: 0,
      categoryIds: selectedCategories,
      color,
      period,
    };

    if (editingId) {
      setEnvelopes(prev => {
        const updated = prev.map(e => e.id === editingId ? envelopeData : e);
        safeJSON.set("hamyon_envelopes", updated);
        return updated;
      });
    } else {
      setEnvelopes(prev => {
        const updated = [envelopeData, ...prev];
        safeJSON.set("hamyon_envelopes", updated);
        return updated;
      });
    }

    showToast("✓", true);
    setShowForm(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    setEnvelopes(prev => {
      const updated = prev.filter(e => e.id !== id);
      safeJSON.set("hamyon_envelopes", updated);
      return updated;
    });
    showToast("✓", true);
  };

  return (
    <div className="screen-container">
      <div className="px-4 pt-4">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveScreen("home")} className="text-2xl">←</button>
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

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20"
        >
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">{t.totalAllocated}</span>
          </div>
          <p className="text-xl font-bold text-foreground">{formatCurrency(totals.allocated, currency)}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-2xl bg-gradient-to-br from-expense/20 to-expense/5 border border-expense/20"
        >
          <span className="text-sm text-muted-foreground">{t.totalSpent}</span>
          <p className="text-xl font-bold text-expense">{formatCurrency(totals.spent, currency)}</p>
        </motion.div>
      </div>

      {/* Envelopes List */}
      {envelopesWithSpending.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          <span className="text-4xl block mb-3">✉️</span>
          <p>{t.noEnvelopes}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {envelopesWithSpending.map((env, index) => {
            const remaining = env.allocated - env.spent;
            const percentage = env.allocated > 0 ? (env.spent / env.allocated) * 100 : 0;
            const isOver = percentage >= 100;

            return (
              <motion.div
                key={env.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 rounded-2xl bg-card border border-border"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{ backgroundColor: `${env.color}20` }}
                    >
                      {env.emoji}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{env.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {env.categoryIds.length} {t.categories.toLowerCase()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${isOver ? 'text-expense' : 'text-foreground'}`}>
                      {formatCurrency(remaining, currency)}
                    </p>
                    <p className="text-sm text-muted-foreground">{t.remaining}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">
                      {formatCurrency(env.spent, currency)} / {formatCurrency(env.allocated, currency)}
                    </span>
                    <span className={isOver ? 'text-expense' : 'text-foreground'}>
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-3 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: isOver ? 'hsl(var(--expense))' : env.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(percentage, 100)}%` }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                </div>

                {/* Categories */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {env.categoryIds.slice(0, 4).map(catId => {
                    const cat = getCat(catId);
                    return (
                      <span key={catId} className="text-xs px-2 py-1 rounded-full bg-secondary">
                        {cat.emoji} {catLabel(cat)}
                      </span>
                    );
                  })}
                  {env.categoryIds.length > 4 && (
                    <span className="text-xs px-2 py-1 rounded-full bg-secondary">
                      +{env.categoryIds.length - 4}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                  <button onClick={() => openEditForm(env)} className="p-2 rounded-lg bg-secondary text-foreground">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(env.id)} className="p-2 rounded-lg bg-destructive/20 text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
      </div>

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
              style={{ paddingBottom: 'calc(1.5rem + 80px + env(safe-area-inset-bottom))' }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">{editingId ? t.save : t.addNew}</h2>
                <button onClick={() => setShowForm(false)} className="p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Emoji & Color */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Emoji</label>
                    <div className="flex gap-1 flex-wrap">
                      {ENVELOPE_EMOJIS.map(e => (
                        <button
                          key={e}
                          onClick={() => setEmoji(e)}
                          className={`p-2 rounded-lg text-xl ${emoji === e ? 'bg-primary/20 ring-2 ring-primary' : 'bg-secondary'}`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Color</label>
                    <div className="flex gap-1 flex-wrap">
                      {ENVELOPE_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setColor(c)}
                          className={`w-8 h-8 rounded-full ${color === c ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t.name}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Food, Transport..."
                    className="w-full p-3 rounded-xl bg-secondary border border-border text-foreground"
                  />
                </div>

                {/* Allocated Amount */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t.allocated}</label>
                  <input
                    type="number"
                    value={allocated}
                    onChange={e => setAllocated(e.target.value)}
                    placeholder="0"
                    className="w-full p-3 rounded-xl bg-secondary border border-border text-foreground"
                  />
                </div>

                {/* Period */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t.period}</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPeriod("weekly")}
                      className={`flex-1 p-3 rounded-xl ${period === "weekly" ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
                    >
                      {t.weekly}
                    </button>
                    <button
                      onClick={() => setPeriod("monthly")}
                      className={`flex-1 p-3 rounded-xl ${period === "monthly" ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
                    >
                      {t.monthly}
                    </button>
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t.categories}</label>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                    {allCats.expense.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => toggleCategory(cat.id)}
                        className={`px-3 py-2 rounded-lg text-sm flex items-center gap-1 ${
                          selectedCategories.includes(cat.id) 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-secondary text-foreground'
                        }`}
                      >
                        <span>{cat.emoji}</span>
                        <span>{catLabel(cat)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Save Button */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  disabled={!name.trim() || !allocated || selectedCategories.length === 0}
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

export default EnvelopesScreen;
