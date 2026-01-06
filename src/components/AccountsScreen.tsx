import React, { useState, memo, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { Account, Transfer } from "@/types";
import { formatCurrency } from "@/lib/exportData";
import { ArrowLeft, Plus, ArrowLeftRight, X } from "lucide-react";

const ACCOUNT_TYPES = [
  { type: "bank", emoji: "🏦", color: "#4DABF7" },
  { type: "wallet", emoji: "👛", color: "#BE4BDB" },
  { type: "cash", emoji: "💵", color: "#51CF66" },
  { type: "card", emoji: "💳", color: "#FF6B6B" },
  { type: "savings", emoji: "🐷", color: "#FAB005" },
];

export const AccountsScreen = memo(() => {
  const { t, lang, setActiveScreen, currency, showToast } = useApp();
  const [accounts, setAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem("hamyon_accounts");
    return saved ? JSON.parse(saved) : [
      { id: "default", name: lang === "uz" ? "Asosiy" : lang === "ru" ? "Основной" : "Main", type: "wallet", balance: 0, currency, emoji: "👛", color: "#BE4BDB", isDefault: true },
    ];
  });
  const [transfers, setTransfers] = useState<Transfer[]>(() => {
    const saved = localStorage.getItem("hamyon_transfers");
    return saved ? JSON.parse(saved) : [];
  });
  const [showAdd, setShowAdd] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [form, setForm] = useState({ name: "", type: "bank" as Account["type"], balance: "", emoji: "🏦", color: "#4DABF7" });
  const [transferForm, setTransferForm] = useState({ fromId: "", toId: "", amount: "", description: "" });

  const totalBalance = useMemo(() => accounts.reduce((sum, acc) => sum + acc.balance, 0), [accounts]);

  const saveAccounts = (newAccounts: Account[]) => {
    setAccounts(newAccounts);
    localStorage.setItem("hamyon_accounts", JSON.stringify(newAccounts));
  };

  const saveTransfers = (newTransfers: Transfer[]) => {
    setTransfers(newTransfers);
    localStorage.setItem("hamyon_transfers", JSON.stringify(newTransfers));
  };

  const handleSaveAccount = () => {
    if (!form.name || !form.balance) return;
    
    const newAccount: Account = {
      id: editingId || Date.now().toString(),
      name: form.name,
      type: form.type,
      balance: Number(form.balance),
      currency,
      emoji: form.emoji,
      color: form.color,
      isDefault: accounts.length === 0,
    };
    
    if (editingId) {
      saveAccounts(accounts.map(a => a.id === editingId ? newAccount : a));
    } else {
      saveAccounts([...accounts, newAccount]);
    }
    
    setShowAdd(false);
    setEditingId(null);
    setForm({ name: "", type: "bank", balance: "", emoji: "🏦", color: "#4DABF7" });
    showToast("✓", true);
  };

  const handleTransfer = () => {
    if (!transferForm.fromId || !transferForm.toId || !transferForm.amount) return;
    if (transferForm.fromId === transferForm.toId) return;
    
    const amount = Number(transferForm.amount);
    const fromAcc = accounts.find(a => a.id === transferForm.fromId);
    if (!fromAcc || fromAcc.balance < amount) {
      showToast(lang === "uz" ? "Mablag' yetarli emas" : lang === "ru" ? "Недостаточно средств" : "Insufficient funds", false);
      return;
    }
    
    const updated = accounts.map(acc => {
      if (acc.id === transferForm.fromId) return { ...acc, balance: acc.balance - amount };
      if (acc.id === transferForm.toId) return { ...acc, balance: acc.balance + amount };
      return acc;
    });
    saveAccounts(updated);
    
    const transfer: Transfer = {
      id: Date.now().toString(),
      fromAccountId: transferForm.fromId,
      toAccountId: transferForm.toId,
      amount,
      date: new Date().toISOString().slice(0, 10),
      description: transferForm.description,
    };
    saveTransfers([transfer, ...transfers]);
    
    setShowTransfer(false);
    setTransferForm({ fromId: "", toId: "", amount: "", description: "" });
    showToast("✓", true);
  };

  const handleDelete = (id: string) => {
    if (accounts.length <= 1) return;
    saveAccounts(accounts.filter(a => a.id !== id));
    showToast("✓", true);
  };

  const labels = {
    title: lang === "uz" ? "Hisoblar" : lang === "ru" ? "Счета" : "Accounts",
    total: lang === "uz" ? "Jami balans" : lang === "ru" ? "Общий баланс" : "Total Balance",
    add: lang === "uz" ? "Hisob qo'shish" : lang === "ru" ? "Добавить счёт" : "Add Account",
    transfer: lang === "uz" ? "O'tkazma" : lang === "ru" ? "Перевод" : "Transfer",
    name: lang === "uz" ? "Nomi" : lang === "ru" ? "Название" : "Name",
    balance: lang === "uz" ? "Balans" : lang === "ru" ? "Баланс" : "Balance",
    from: lang === "uz" ? "Kimdan" : lang === "ru" ? "Откуда" : "From",
    to: lang === "uz" ? "Kimga" : lang === "ru" ? "Куда" : "To",
    amount: lang === "uz" ? "Summa" : lang === "ru" ? "Сумма" : "Amount",
    save: lang === "uz" ? "Saqlash" : lang === "ru" ? "Сохранить" : "Save",
    cancel: lang === "uz" ? "Bekor" : lang === "ru" ? "Отмена" : "Cancel",
    recent: lang === "uz" ? "So'nggi o'tkazmalar" : lang === "ru" ? "Последние переводы" : "Recent Transfers",
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
            <h1 className="text-large-title text-foreground">{labels.title}</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowTransfer(true)}
              className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center active:opacity-70"
            >
              <ArrowLeftRight className="w-5 h-5 text-foreground" />
            </button>
            <button
              onClick={() => {
                setEditingId(null);
                setForm({ name: "", type: "bank", balance: "", emoji: "🏦", color: "#4DABF7" });
                setShowAdd(true);
              }}
              className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:opacity-70"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Total Balance (Info Card) */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-info mb-6"
      >
        <p className="text-caption mb-1">{labels.total}</p>
        <p className="card-info-number">{formatCurrency(totalBalance, currency)}</p>
        <p className="text-caption mt-1">{accounts.length} {lang === "uz" ? "hisob" : lang === "ru" ? "счетов" : "accounts"}</p>
      </motion.div>

      {/* Accounts List */}
      <div className="space-y-3 mb-6">
        {accounts.map((acc, i) => (
          <motion.div
            key={acc.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.2 }}
            className="card-info"
            onClick={() => {
              setEditingId(acc.id);
              setForm({ name: acc.name, type: acc.type, balance: String(acc.balance), emoji: acc.emoji, color: acc.color });
              setShowAdd(true);
            }}
          >
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: acc.color + "20" }}
              >
                {acc.emoji}
              </div>
              <div className="flex-1">
                <p className="text-body-medium text-foreground">{acc.name}</p>
                <p className="text-caption capitalize">{acc.type}</p>
              </div>
              <div className="text-right">
                <p className={`text-body-medium ${acc.balance >= 0 ? 'amount-income' : 'amount-expense'}`}>
                  {formatCurrency(acc.balance, currency)}
                </p>
                {acc.isDefault && <span className="text-caption text-primary">✓ Default</span>}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Transfers */}
      {transfers.length > 0 && (
        <section className="mb-6">
          <div className="section-header">
            <h2 className="section-title">{labels.recent}</h2>
          </div>
          <div className="space-y-2">
            {transfers.slice(0, 5).map(tr => {
              const from = accounts.find(a => a.id === tr.fromAccountId);
              const to = accounts.find(a => a.id === tr.toAccountId);
              return (
                <div key={tr.id} className="card-insight">
                  <span className="text-lg">{from?.emoji || "?"}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-lg">{to?.emoji || "?"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-medium text-foreground truncate">{tr.description || "Transfer"}</p>
                    <p className="text-caption">{tr.date}</p>
                  </div>
                  <p className="text-body-medium text-foreground">{formatCurrency(tr.amount, currency)}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Add/Edit Account Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowAdd(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.25 }}
              className="absolute bottom-0 left-0 right-0 modal-content"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-6" />
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-title text-foreground">
                  {editingId ? (lang === "uz" ? "Tahrirlash" : lang === "ru" ? "Редактировать" : "Edit") : labels.add}
                </h3>
                <button onClick={() => setShowAdd(false)} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center active:opacity-70">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              
              {/* Account Type */}
              <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
                {ACCOUNT_TYPES.map(at => (
                  <button
                    key={at.type}
                    onClick={() => setForm({ ...form, type: at.type as Account["type"], emoji: at.emoji, color: at.color })}
                    className={`px-4 py-3 rounded-xl flex flex-col items-center gap-1 min-w-[70px] active:opacity-70 ${
                      form.type === at.type ? "bg-primary text-primary-foreground" : "bg-secondary"
                    }`}
                  >
                    <span className="text-xl">{at.emoji}</span>
                    <span className="text-caption capitalize">{at.type}</span>
                  </button>
                ))}
              </div>

              <div className="mb-4">
                <label className="text-caption mb-2 block">{labels.name}</label>
                <input
                  type="text"
                  placeholder={labels.name}
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="input-clean"
                />
              </div>
              
              <div className="mb-6">
                <label className="text-caption mb-2 block">{labels.balance}</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder={labels.balance}
                  value={form.balance}
                  onChange={e => setForm({ ...form, balance: e.target.value.replace(/[^0-9.-]/g, '') })}
                  className="input-clean text-display"
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1">{labels.cancel}</button>
                <button onClick={handleSaveAccount} className="btn-primary flex-1">{labels.save}</button>
              </div>
              
              {editingId && accounts.length > 1 && (
                <button
                  onClick={() => { handleDelete(editingId); setShowAdd(false); }}
                  className="w-full mt-3 py-3 text-destructive text-body-medium active:opacity-70"
                >
                  {lang === "uz" ? "O'chirish" : lang === "ru" ? "Удалить" : "Delete"}
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transfer Modal */}
      <AnimatePresence>
        {showTransfer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowTransfer(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.25 }}
              className="absolute bottom-0 left-0 right-0 modal-content"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-6" />
              <h3 className="text-title text-foreground mb-6">{labels.transfer}</h3>
              
              <div className="mb-4">
                <label className="text-caption mb-2 block">{labels.from}</label>
                <select
                  value={transferForm.fromId}
                  onChange={e => setTransferForm({ ...transferForm, fromId: e.target.value })}
                  className="input-clean"
                >
                  <option value="">--</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.emoji} {acc.name}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="text-caption mb-2 block">{labels.to}</label>
                <select
                  value={transferForm.toId}
                  onChange={e => setTransferForm({ ...transferForm, toId: e.target.value })}
                  className="input-clean"
                >
                  <option value="">--</option>
                  {accounts.filter(a => a.id !== transferForm.fromId).map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.emoji} {acc.name}</option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label className="text-caption mb-2 block">{labels.amount}</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder={labels.amount}
                  value={transferForm.amount}
                  onChange={e => setTransferForm({ ...transferForm, amount: e.target.value.replace(/[^0-9]/g, '') })}
                  className="input-clean text-display"
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowTransfer(false)} className="btn-secondary flex-1">{labels.cancel}</button>
                <button onClick={handleTransfer} className="btn-primary flex-1">{labels.transfer}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

AccountsScreen.displayName = "AccountsScreen";