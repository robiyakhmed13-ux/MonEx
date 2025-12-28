import React, { useState, useMemo, memo, useEffect } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { NetWorthSnapshot, Account, DebtItem } from "@/types";
import { safeJSON } from "@/lib/storage";
import { formatCurrency } from "@/lib/exportData";
import { TrendingUp, TrendingDown, Wallet, CreditCard, PiggyBank, Building2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

export const NetWorthScreen = memo(() => {
  const { lang, currency, setActiveScreen, balance } = useApp();
  const [accounts] = useState<Account[]>(() => safeJSON.get("hamyon_accounts", []));
  const [debts] = useState<DebtItem[]>(() => safeJSON.get("hamyon_debts", []));
  const [history, setHistory] = useState<NetWorthSnapshot[]>(() => safeJSON.get("hamyon_netWorthHistory", []));

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

  return (
    <div className="min-h-screen bg-background pb-32 px-4 pt-4">
      {/* Header */}
      <header className="flex items-center gap-3 mb-6">
        <button onClick={() => setActiveScreen("home")} className="text-2xl">←</button>
        <h1 className="text-xl font-bold text-foreground">{t.title}</h1>
      </header>

      {/* Net Worth Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-3xl bg-gradient-to-br from-primary/30 via-primary/10 to-transparent border border-primary/20 mb-6"
      >
        <p className="text-sm text-muted-foreground mb-2">{t.netWorth}</p>
        <div className="flex items-baseline gap-3 mb-4">
          <h2 className={`text-4xl font-bold ${netWorth >= 0 ? 'text-income' : 'text-expense'}`}>
            {formatCurrency(netWorth, currency)}
          </h2>
          {netWorthChange !== 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${
                netWorthChange > 0 ? 'bg-income/20 text-income' : 'bg-expense/20 text-expense'
              }`}
            >
              {netWorthChange > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{changePercent > 0 ? '+' : ''}{changePercent.toFixed(1)}%</span>
            </motion.div>
          )}
        </div>

        {/* Assets vs Liabilities */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-xl bg-income/10 border border-income/20">
            <p className="text-xs text-muted-foreground mb-1">{t.assets}</p>
            <p className="text-lg font-bold text-income">+{formatCurrency(totalAssets, currency)}</p>
          </div>
          <div className="p-3 rounded-xl bg-expense/10 border border-expense/20">
            <p className="text-xs text-muted-foreground mb-1">{t.liabilities}</p>
            <p className="text-lg font-bold text-expense">-{formatCurrency(totalLiabilities, currency)}</p>
          </div>
        </div>
      </motion.div>

      {/* Trend Chart */}
      {chartData.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-2xl bg-card border border-border mb-6"
        >
          <h3 className="text-sm font-medium text-foreground mb-4">{t.trend}</h3>
          <div className="h-40">
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
        </motion.div>
      )}

      {/* Assets Breakdown */}
      <section className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-3">{t.assets}</h3>
        <div className="space-y-2">
          {/* Main Balance */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-4 rounded-xl bg-card border border-border flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">{t.mainBalance}</p>
              <p className="text-sm text-muted-foreground">Hamyon</p>
            </div>
            <p className="font-bold text-income">+{formatCurrency(balance, currency)}</p>
          </motion.div>

          {/* Other Accounts */}
          {accounts.map((account, index) => (
            <motion.div
              key={account.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: (index + 1) * 0.05 }}
              className="p-4 rounded-xl bg-card border border-border flex items-center gap-3"
            >
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${account.color}20`, color: account.color }}
              >
                {getAccountIcon(account.type)}
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">{account.name}</p>
                <p className="text-sm text-muted-foreground">{account.type}</p>
              </div>
              <p className="font-bold text-income">+{formatCurrency(account.balance, account.currency)}</p>
            </motion.div>
          ))}

          {accounts.length === 0 && (
            <p className="text-center text-muted-foreground py-4">{t.noData}</p>
          )}
        </div>
      </section>

      {/* Liabilities Breakdown */}
      <section>
        <h3 className="text-lg font-semibold text-foreground mb-3">{t.liabilities}</h3>
        <div className="space-y-2">
          {debts.map((debt, index) => (
            <motion.div
              key={debt.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 rounded-xl bg-card border border-border flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-expense/20 flex items-center justify-center text-expense">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">{debt.name}</p>
                <p className="text-sm text-muted-foreground">{debt.lender}</p>
              </div>
              <p className="font-bold text-expense">-{formatCurrency(debt.remainingAmount, currency)}</p>
            </motion.div>
          ))}

          {debts.length === 0 && (
            <p className="text-center text-muted-foreground py-4">{t.noData}</p>
          )}
        </div>
      </section>
    </div>
  );
});

export default NetWorthScreen;
