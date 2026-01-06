import React, { useState, useMemo, memo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { NetWorthSnapshot, Account, DebtItem } from "@/types";
import { safeJSON } from "@/lib/storage";
import { formatCurrency } from "@/lib/exportData";
import { TrendingUp, TrendingDown, Wallet, CreditCard, PiggyBank, Building2, ArrowLeft, Plus, X } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

export const NetWorthScreen = memo(() => {
  const { lang, currency, setActiveScreen, balance, showToast } = useApp();
  const [accounts, setAccounts] = useState<Account[]>(() => safeJSON.get("hamyon_accounts", []));
  const [debts] = useState<DebtItem[]>(() => safeJSON.get("hamyon_debts", []));
  const [history, setHistory] = useState<NetWorthSnapshot[]>(() => safeJSON.get("hamyon_netWorthHistory", []));
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [accountForm, setAccountForm] = useState({ name: "", balance: "", type: "bank" as Account["type"] });

  const t = {
    title: lang === "ru" ? "Чистая стоимость" : lang === "uz" ? "Sof qiymat" : "Net Worth",
    assets: lang === "ru" ? "Активы" : lang === "uz" ? "Aktivlar" : "Assets",
    liabilities: lang === "ru" ? "Обязательства" : lang === "uz" ? "Majburiyatlar" : "Liabilities",
    netWorth: lang === "ru" ? "Чистая стоимость" : lang === "uz" ? "Sof qiymat" : "Net Worth",
    accounts: lang === "ru" ? "Счета" : lang === "uz" ? "Hisoblar" : "Accounts",
    debts: lang === "ru" ? "Долги" : lang === "uz" ? "Qarzlar" : "Debts",
    trend: lang === "ru" ? "Тренд" : lang === "uz" ? "Trend" : "Trend",
    noData: lang === "ru" ? "Нет данных" : lang === "uz" ? "Ma'lumot yo'q" : "No data yet",
    mainBalance: lang === "ru" ? "Основной баланс" : lang === "uz" ? "Asosiy balans" : "Main Balance",
    addAccount: lang === "ru" ? "Добавить счёт" : lang === "uz" ? "Hisob qo'shish" : "Add Account",
    accountName: lang === "ru" ? "Название" : lang === "uz" ? "Nomi" : "Name",
    accountBalance: lang === "ru" ? "Баланс" : lang === "uz" ? "Balans" : "Balance",
    accountType: lang === "ru" ? "Тип" : lang === "uz" ? "Turi" : "Type",
    save: lang === "ru" ? "Сохранить" : lang === "uz" ? "Saqlash" : "Save",
    cancel: lang === "ru" ? "Отмена" : lang === "uz" ? "Bekor" : "Cancel",
  };

  // Calculate totals
  const totalAssets = useMemo(() => {
    const accountsTotal = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    return accountsTotal + balance;
  }, [accounts, balance]);

  const totalLiabilities = useMemo(() => {
    return debts.reduce((sum, debt) => sum + debt.remainingAmount, 0);
  }, [debts]);

  const netWorth = totalAssets - totalLiabilities;
  const netWorthChange = history.length >= 2 
    ? netWorth - history[history.length - 2].netWorth 
    : 0;
  const changePercent = history.length >= 2 && history[history.length - 2].netWorth !== 0
    ? ((netWorth - history[history.length - 2].netWorth) / Math.abs(history[history.length - 2].netWorth)) * 100
    : 0;

  // Record today's snapshot
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const hasToday = history.some(h => h.date === today);
    
    if (!hasToday) {
      const snapshot: NetWorthSnapshot = {
        date: today,
        totalAssets,
        totalLiabilities,
        netWorth,
        breakdown: {
          accounts: accounts.reduce((acc, a) => ({ ...acc, [a.name]: a.balance }), {}),
          investments: {},
          debts: debts.reduce((acc, d) => ({ ...acc, [d.name]: d.remainingAmount }), {}),
        },
      };
      const updated = [...history, snapshot].slice(-365); // Keep last year
      setHistory(updated);
      safeJSON.set("hamyon_netWorthHistory", updated);
    }
  }, [totalAssets, totalLiabilities, netWorth, accounts, debts, history]);

  // Chart data (last 30 days)
  const chartData = useMemo(() => {
    return history.slice(-30).map(h => ({
      date: h.date.slice(5),
      netWorth: h.netWorth,
      assets: h.totalAssets,
      liabilities: h.totalLiabilities,
    }));
  }, [history]);

  const getAccountIcon = (type: Account["type"]) => {
    switch (type) {
      case "bank": return <Building2 className="w-5 h-5" />;
      case "card": return <CreditCard className="w-5 h-5" />;
      case "savings": return <PiggyBank className="w-5 h-5" />;
      default: return <Wallet className="w-5 h-5" />;
    }
  };

  // Save accounts to storage
  const saveAccounts = (newAccounts: Account[]) => {
    setAccounts(newAccounts);
    safeJSON.set("hamyon_accounts", newAccounts);
  };

  // Handle adding new account
  const handleAddAccount = () => {
    if (!accountForm.name || !accountForm.balance) return;
    
    const emojis = { bank: "🏦", card: "💳", savings: "🐷", cash: "💵", wallet: "👛" };
    const newAccount: Account = {
      id: Date.now().toString(),
      name: accountForm.name,
      balance: Number(accountForm.balance),
      currency,
      type: accountForm.type,
      color: "#3B82F6",
      emoji: emojis[accountForm.type] || "💰",
    };
    
    saveAccounts([...accounts, newAccount]);
    setShowAddAccount(false);
    setAccountForm({ name: "", balance: "", type: "bank" });
    showToast("✓", true);
  };

  return (
    <div className="screen-container">
      {/* Header */}
      <header className="screen-header">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setActiveScreen("home")} 
            className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center active:opacity-80"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-large-title text-foreground">{t.title}</h1>
        </div>
      </header>

      {/* Net Worth Card */}
      <div className="card-elevated p-5 mb-section">
        <p className="text-caption mb-2">{t.netWorth}</p>
        <div className="flex items-baseline gap-3 mb-4">
          <h2 className={`text-display ${netWorth >= 0 ? 'text-income' : 'text-expense'}`}>
            {formatCurrency(netWorth, currency)}
          </h2>
          {netWorthChange !== 0 && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-body-medium ${
              netWorthChange > 0 ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense'
            }`}>
              {netWorthChange > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{changePercent > 0 ? '+' : ''}{changePercent.toFixed(1)}%</span>
            </div>
          )}
        </div>

        {/* Assets vs Liabilities */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-income/10">
            <p className="text-caption mb-1">{t.assets}</p>
            <p className="text-title text-income">+{formatCurrency(totalAssets, currency)}</p>
          </div>
          <div className="p-3 rounded-xl bg-expense/10">
            <p className="text-caption mb-1">{t.liabilities}</p>
            <p className="text-title text-expense">-{formatCurrency(totalLiabilities, currency)}</p>
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      {chartData.length > 1 && (
        <div className="card-elevated mb-section">
          <h3 className="text-title text-foreground mb-4">{t.trend}</h3>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    padding: '8px 12px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number) => [formatCurrency(value, currency), t.netWorth]}
                />
                <Area
                  type="monotone"
                  dataKey="netWorth"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#netWorthGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Assets Breakdown */}
      <section className="mb-section">
        <div className="section-header">
          <h3 className="section-title">{t.assets}</h3>
          <button 
            onClick={() => setShowAddAccount(true)}
            className="section-action flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            {t.addAccount}
          </button>
        </div>
        <div className="space-y-3">
          {/* Main Balance */}
          <div className="card-info flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-body-medium text-foreground">{t.mainBalance}</p>
              <p className="text-caption">Hamyon</p>
            </div>
            <p className="text-body-medium text-income">+{formatCurrency(balance, currency)}</p>
          </div>

          {/* Other Accounts */}
          {accounts.map((account) => (
            <div
              key={account.id}
              className="card-info flex items-center gap-3"
            >
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${account.color}15`, color: account.color }}
              >
                {getAccountIcon(account.type)}
              </div>
              <div className="flex-1">
                <p className="text-body-medium text-foreground">{account.name}</p>
                <p className="text-caption">{account.type}</p>
              </div>
              <p className="text-body-medium text-income">+{formatCurrency(account.balance, account.currency)}</p>
            </div>
          ))}

          {accounts.length === 0 && (
            <button 
              onClick={() => setShowAddAccount(true)}
              className="card-info w-full border-2 border-dashed border-border text-center py-6 active:opacity-80"
              style={{ boxShadow: 'none' }}
            >
              <Plus className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-caption">{t.addAccount}</p>
            </button>
          )}
        </div>
      </section>

      {/* Liabilities Breakdown */}
      <section>
        <h3 className="section-title mb-4">{t.liabilities}</h3>
        <div className="space-y-3">
          {debts.map((debt) => (
            <div
              key={debt.id}
              className="card-info flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-expense/10 flex items-center justify-center text-expense">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-body-medium text-foreground">{debt.name}</p>
                <p className="text-caption">{debt.lender}</p>
              </div>
              <p className="text-body-medium text-expense">-{formatCurrency(debt.remainingAmount, currency)}</p>
            </div>
          ))}

          {debts.length === 0 && (
            <div className="card-insight justify-center py-6">
              <p className="text-caption">{t.noData}</p>
            </div>
          )}
        </div>
      </section>

      {/* Add Account Modal */}
      <AnimatePresence>
        {showAddAccount && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowAddAccount(false)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="absolute bottom-0 left-0 right-0 modal-content"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-title text-foreground">{t.addAccount}</h3>
                <button 
                  onClick={() => setShowAddAccount(false)}
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <input
                type="text"
                placeholder={t.accountName}
                value={accountForm.name}
                onChange={e => setAccountForm({ ...accountForm, name: e.target.value })}
                className="input-clean mb-3"
              />
              
              <input
                type="text"
                inputMode="numeric"
                placeholder={t.accountBalance}
                value={accountForm.balance}
                onChange={e => setAccountForm({ ...accountForm, balance: e.target.value.replace(/[^0-9]/g, '') })}
                className="input-clean mb-3"
              />
              
              {/* Account Type Selection */}
              <div className="flex gap-2 mb-6">
                {(["bank", "card", "savings", "cash"] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setAccountForm({ ...accountForm, type })}
                    className={`flex-1 py-3 rounded-xl text-body-medium flex flex-col items-center gap-2 transition-colors ${
                      accountForm.type === type ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {getAccountIcon(type)}
                    <span className="text-xs capitalize">{type}</span>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowAddAccount(false)} className="btn-secondary flex-1">
                  {t.cancel}
                </button>
                <button onClick={handleAddAccount} className="btn-primary flex-1">
                  {t.save}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default NetWorthScreen;
