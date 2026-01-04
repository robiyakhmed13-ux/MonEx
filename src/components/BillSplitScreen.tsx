import React, { useState, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { BillSplit, BillParticipant } from "@/types";
import { safeJSON, uid } from "@/lib/storage";
import { formatCurrency } from "@/lib/exportData";
import { Plus, X, Users, Check, Trash2, UserPlus, Share2 } from "lucide-react";

export const BillSplitScreen = memo(() => {
  const { lang, currency, showToast, setActiveScreen } = useApp();
  const [bills, setBills] = useState<BillSplit[]>(() => safeJSON.get("hamyon_billSplits", []));
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [participants, setParticipants] = useState<BillParticipant[]>([]);
  const [newParticipantName, setNewParticipantName] = useState("");

  const t = {
    title: lang === "ru" ? "Разделить счёт" : lang === "uz" ? "Hisobni bo'lish" : "Split Bill",
    addNew: lang === "ru" ? "Новый счёт" : lang === "uz" ? "Yangi hisob" : "New Bill",
    billTitle: lang === "ru" ? "Название" : lang === "uz" ? "Nomi" : "Title",
    total: lang === "ru" ? "Общая сумма" : lang === "uz" ? "Jami summa" : "Total Amount",
    paidBy: lang === "ru" ? "Кто платил" : lang === "uz" ? "Kim to'ladi" : "Paid By",
    participants: lang === "ru" ? "Участники" : lang === "uz" ? "Ishtirokchilar" : "Participants",
    addParticipant: lang === "ru" ? "Добавить" : lang === "uz" ? "Qo'shish" : "Add",
    splitEqually: lang === "ru" ? "Разделить поровну" : lang === "uz" ? "Teng bo'lish" : "Split Equally",
    save: lang === "ru" ? "Сохранить" : lang === "uz" ? "Saqlash" : "Save",
    noBills: lang === "ru" ? "Нет счетов" : lang === "uz" ? "Hisoblar yo'q" : "No bills yet",
    owes: lang === "ru" ? "должен" : lang === "uz" ? "qarz" : "owes",
    paid: lang === "ru" ? "Оплачено" : lang === "uz" ? "To'landi" : "Paid",
    pending: lang === "ru" ? "Ожидает" : lang === "uz" ? "Kutilmoqda" : "Pending",
    settled: lang === "ru" ? "Погашен" : lang === "uz" ? "To'langan" : "Settled",
    share: lang === "ru" ? "Поделиться" : lang === "uz" ? "Ulashish" : "Share",
  };

  const resetForm = () => {
    setTitle("");
    setTotalAmount("");
    setPaidBy("");
    setParticipants([]);
    setNewParticipantName("");
  };

  const addParticipant = () => {
    if (!newParticipantName.trim()) return;
    setParticipants(prev => [
      ...prev, 
      { id: uid(), name: newParticipantName.trim(), amount: 0, paid: false }
    ]);
    setNewParticipantName("");
  };

  const removeParticipant = (id: string) => {
    setParticipants(prev => prev.filter(p => p.id !== id));
  };

  const splitEqually = () => {
    if (!totalAmount || participants.length === 0) return;
    const perPerson = parseFloat(totalAmount) / participants.length;
    setParticipants(prev => prev.map(p => ({ ...p, amount: Math.round(perPerson) })));
  };

  const updateParticipantAmount = (id: string, amount: number) => {
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, amount } : p));
  };

  const handleSave = () => {
    if (!title.trim() || !totalAmount || participants.length === 0) return;
    
    const bill: BillSplit = {
      id: uid(),
      title: title.trim(),
      totalAmount: parseFloat(totalAmount),
      currency,
      date: new Date().toISOString().slice(0, 10),
      paidBy: paidBy || participants[0]?.name || "",
      participants,
      settled: false,
    };

    setBills(prev => {
      const updated = [bill, ...prev];
      safeJSON.set("hamyon_billSplits", updated);
      return updated;
    });
    
    showToast("✓", true);
    setShowForm(false);
    resetForm();
  };

  const toggleParticipantPaid = (billId: string, participantId: string) => {
    setBills(prev => {
      const updated = prev.map(b => {
        if (b.id !== billId) return b;
        const newParticipants = b.participants.map(p => 
          p.id === participantId ? { ...p, paid: !p.paid } : p
        );
        const allPaid = newParticipants.every(p => p.paid);
        return { ...b, participants: newParticipants, settled: allPaid };
      });
      safeJSON.set("hamyon_billSplits", updated);
      return updated;
    });
  };

  const deleteBill = (id: string) => {
    setBills(prev => {
      const updated = prev.filter(b => b.id !== id);
      safeJSON.set("hamyon_billSplits", updated);
      return updated;
    });
    showToast("✓", true);
  };

  const shareBill = async (bill: BillSplit) => {
    const text = `${bill.title}\n${t.total}: ${formatCurrency(bill.totalAmount, bill.currency)}\n${t.paidBy}: ${bill.paidBy}\n\n${bill.participants.map(p => `${p.name}: ${formatCurrency(p.amount, bill.currency)} ${p.paid ? '✓' : ''}`).join('\n')}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: bill.title, text });
      } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      showToast("Copied!", true);
    }
  };

  // Stats
  const pendingBills = bills.filter(b => !b.settled);
  const totalOwed = pendingBills.reduce((sum, b) => 
    sum + b.participants.filter(p => !p.paid).reduce((s, p) => s + p.amount, 0), 0
  );

  return (
    <div className="min-h-screen bg-background pb-32 px-4 pt-4">
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
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 mb-6"
      >
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">{t.pending}</p>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(totalOwed, currency)}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Bills List */}
      {bills.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          <span className="text-4xl block mb-3">🧾</span>
          <p>{t.noBills}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bills.map((bill, index) => (
            <motion.div
              key={bill.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-4 rounded-2xl border ${bill.settled ? 'bg-muted/50 border-income/20' : 'bg-card border-border'}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-foreground">{bill.title}</h3>
                  <p className="text-sm text-muted-foreground">{bill.date} • {t.paidBy}: {bill.paidBy}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-foreground">{formatCurrency(bill.totalAmount, bill.currency)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${bill.settled ? 'bg-income/20 text-income' : 'bg-amber-500/20 text-amber-600'}`}>
                    {bill.settled ? t.settled : t.pending}
                  </span>
                </div>
              </div>

              {/* Participants */}
              <div className="space-y-2 mb-3">
                {bill.participants.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleParticipantPaid(bill.id, p.id)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center ${p.paid ? 'bg-income text-white' : 'bg-muted border-2 border-border'}`}
                      >
                        {p.paid && <Check className="w-4 h-4" />}
                      </button>
                      <span className={`${p.paid ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {p.name}
                      </span>
                    </div>
                    <span className="font-medium text-foreground">
                      {formatCurrency(p.amount, bill.currency)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button onClick={() => shareBill(bill)} className="p-2 rounded-lg bg-secondary text-foreground">
                  <Share2 className="w-4 h-4" />
                </button>
                <button onClick={() => deleteBill(bill.id)} className="p-2 rounded-lg bg-destructive/20 text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Bill Form */}
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
              className="bg-background rounded-t-3xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto pb-[calc(6rem+80px+env(safe-area-inset-bottom))]"
              style={{ paddingBottom: 'calc(1.5rem + 80px + env(safe-area-inset-bottom))' }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">{t.addNew}</h2>
                <button onClick={() => setShowForm(false)} className="p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t.billTitle}</label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Dinner, Trip..."
                    className="w-full p-3 rounded-xl bg-secondary border border-border text-foreground"
                  />
                </div>

                {/* Total Amount */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t.total}</label>
                  <input
                    type="number"
                    value={totalAmount}
                    onChange={e => setTotalAmount(e.target.value)}
                    placeholder="0"
                    className="w-full p-3 rounded-xl bg-secondary border border-border text-foreground"
                  />
                </div>

                {/* Paid By */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t.paidBy}</label>
                  <input
                    type="text"
                    value={paidBy}
                    onChange={e => setPaidBy(e.target.value)}
                    placeholder="You"
                    className="w-full p-3 rounded-xl bg-secondary border border-border text-foreground"
                  />
                </div>

                {/* Participants */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t.participants}</label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newParticipantName}
                      onChange={e => setNewParticipantName(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addParticipant()}
                      placeholder="Name..."
                      className="flex-1 p-3 rounded-xl bg-secondary border border-border text-foreground"
                    />
                    <button
                      onClick={addParticipant}
                      className="p-3 rounded-xl bg-primary text-primary-foreground"
                    >
                      <UserPlus className="w-5 h-5" />
                    </button>
                  </div>

                  {participants.length > 0 && (
                    <>
                      <div className="space-y-2 mb-3">
                        {participants.map(p => (
                          <div key={p.id} className="flex items-center gap-2">
                            <span className="flex-1 text-foreground">{p.name}</span>
                            <input
                              type="number"
                              value={p.amount || ""}
                              onChange={e => updateParticipantAmount(p.id, parseFloat(e.target.value) || 0)}
                              placeholder="0"
                              className="w-24 p-2 rounded-lg bg-secondary border border-border text-foreground text-center"
                            />
                            <button
                              onClick={() => removeParticipant(p.id)}
                              className="p-2 text-destructive"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={splitEqually}
                        className="w-full p-3 rounded-xl bg-secondary text-foreground font-medium"
                      >
                        {t.splitEqually}
                      </button>
                    </>
                  )}
                </div>

                {/* Save Button */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  disabled={!title.trim() || !totalAmount || participants.length === 0}
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

export default BillSplitScreen;
