import React, { useState, useMemo, memo } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { DebtItem } from "@/types";
import { safeJSON } from "@/lib/storage";
import { formatCurrency } from "@/lib/exportData";
import { TrendingDown, Calendar, Target, Zap, Snowflake, Plus, X, Trash2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar } from "recharts";

export const DebtPayoffScreen = memo(() => {
  const { lang, currency, setActiveScreen, showToast } = useApp();
  const [debts, setDebts] = useState<DebtItem[]>(() => safeJSON.get("hamyon_debts", []));
  const [strategy, setStrategy] = useState<"snowball" | "avalanche">("avalanche");
  const [extraPayment, setExtraPayment] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form state
  const [formName, setFormName] = useState("");
  const [formLender, setFormLender] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formInterest, setFormInterest] = useState("");
  const [formMinPayment, setFormMinPayment] = useState("");

  const t = {
    title: lang === "ru" ? "План погашения долга" : lang === "uz" ? "Qarzni to'lash rejasi" : "Debt Payoff Plan",
    strategy: lang === "ru" ? "Стратегия" : lang === "uz" ? "Strategiya" : "Strategy",
    snowball: lang === "ru" ? "Снежный ком" : lang === "uz" ? "Qor bo'roni" : "Snowball",
    snowballDesc: lang === "ru" ? "Сначала мелкие долги (мотивация)" : lang === "uz" ? "Avval kichik qarzlar" : "Smallest debts first (motivation)",
    avalanche: lang === "ru" ? "Лавина" : lang === "uz" ? "Ko'chki" : "Avalanche",
    avalancheDesc: lang === "ru" ? "Сначала высокий %" : lang === "uz" ? "Avval yuqori %" : "Highest interest first (save money)",
    extraPayment: lang === "ru" ? "Дополнительный платёж" : lang === "uz" ? "Qo'shimcha to'lov" : "Extra Payment",
    perMonth: lang === "ru" ? "в месяц" : lang === "uz" ? "oyiga" : "per month",
    totalDebt: lang === "ru" ? "Общий долг" : lang === "uz" ? "Jami qarz" : "Total Debt",
    payoffDate: lang === "ru" ? "Дата погашения" : lang === "uz" ? "To'lash sanasi" : "Payoff Date",
    interestSaved: lang === "ru" ? "Экономия на %" : lang === "uz" ? "% bo'yicha tejash" : "Interest Saved",
    order: lang === "ru" ? "Порядок погашения" : lang === "uz" ? "To'lash tartibi" : "Payoff Order",
    noDebts: lang === "ru" ? "Нет долгов" : lang === "uz" ? "Qarzlar yo'q" : "No debts",
    addDebts: lang === "ru" ? "Добавьте долги для симуляции" : lang === "uz" ? "Simulyatsiya uchun qarz qo'shing" : "Add debts for simulation",
    remaining: lang === "ru" ? "Остаток" : lang === "uz" ? "Qoldiq" : "Remaining",
    rate: lang === "ru" ? "Ставка" : lang === "uz" ? "Stavka" : "Rate",
    monthlyMin: lang === "ru" ? "Мин. платёж" : lang === "uz" ? "Min. to'lov" : "Min. Payment",
    timeline: lang === "ru" ? "График погашения" : lang === "uz" ? "To'lash jadvali" : "Payoff Timeline",
    addDebt: lang === "ru" ? "Добавить долг" : lang === "uz" ? "Qarz qo'shish" : "Add Debt",
    debtName: lang === "ru" ? "Название долга" : lang === "uz" ? "Qarz nomi" : "Debt Name",
    lender: lang === "ru" ? "Кредитор" : lang === "uz" ? "Kreditor" : "Lender",
    balance: lang === "ru" ? "Остаток долга" : lang === "uz" ? "Qarz qoldig'i" : "Balance",
    interestRate: lang === "ru" ? "Ставка (%)" : lang === "uz" ? "Foiz stavkasi" : "Interest Rate (%)",
    minPayment: lang === "ru" ? "Мин. платёж" : lang === "uz" ? "Min. to'lov" : "Min. Payment",
    save: lang === "ru" ? "Сохранить" : lang === "uz" ? "Saqlash" : "Save",
    months: lang === "ru" ? "мес" : lang === "uz" ? "oy" : "mo",
  };

  const saveDebts = (newDebts: DebtItem[]) => {
    setDebts(newDebts);
    safeJSON.set("hamyon_debts", newDebts);
  };

  const handleAddDebt = () => {
    if (!formName || !formAmount || !formInterest || !formMinPayment) return;
    
    const newDebt: DebtItem = {
      id: Date.now().toString(),
      name: formName,
      lender: formLender || formName,
      totalAmount: parseFloat(formAmount),
      remainingAmount: parseFloat(formAmount),
      interestRate: parseFloat(formInterest),
      monthlyPayment: parseFloat(formMinPayment),
      startDate: new Date().toISOString().slice(0, 10),
      type: "loan",
    };
    
    saveDebts([...debts, newDebt]);
    setShowAddModal(false);
    setFormName("");
    setFormLender("");
    setFormAmount("");
    setFormInterest("");
    setFormMinPayment("");
    showToast("✓", true);
  };

  const handleDeleteDebt = (id: string) => {
    saveDebts(debts.filter(d => d.id !== id));
    showToast("✓", true);
  };

  // Sort debts by strategy
  const sortedDebts = useMemo(() => {
    const debtsCopy = [...debts];
    if (strategy === "snowball") {
      return debtsCopy.sort((a, b) => a.remainingAmount - b.remainingAmount);
    } else {
      return debtsCopy.sort((a, b) => b.interestRate - a.interestRate);
    }
  }, [debts, strategy]);

  // Calculate payoff schedule with timeline data
  const payoffPlan = useMemo(() => {
    if (debts.length === 0) return null;

    const extra = parseFloat(extraPayment) || 0;
    const totalMinPayment = debts.reduce((sum, d) => sum + d.monthlyPayment, 0);
    const totalMonthlyBudget = totalMinPayment + extra;
    
    let debtBalances = sortedDebts.map(d => ({
      ...d,
      balance: d.remainingAmount,
      paidOff: false,
      payoffMonth: 0,
    }));
    
    let month = 0;
    let totalInterestPaid = 0;
    const maxMonths = 360;
    const timelineData: Array<{ month: number; totalBalance: number; label: string }> = [];
    
    // Record initial state
    timelineData.push({
      month: 0,
      totalBalance: debtBalances.reduce((s, d) => s + d.balance, 0),
      label: "0",
    });
    
    while (debtBalances.some(d => !d.paidOff) && month < maxMonths) {
      month++;
      let availableBudget = totalMonthlyBudget;
      
      debtBalances.forEach(d => {
        if (d.paidOff) return;
        
        const monthlyInterest = (d.interestRate / 100 / 12) * d.balance;
        d.balance += monthlyInterest;
        totalInterestPaid += monthlyInterest;
        
        const payment = Math.min(d.monthlyPayment, d.balance);
        d.balance -= payment;
        availableBudget -= payment;
        
        if (d.balance <= 0.01) {
          d.balance = 0;
          d.paidOff = true;
          d.payoffMonth = month;
        }
      });
      
      for (const d of debtBalances) {
        if (d.paidOff || availableBudget <= 0) continue;
        
        const extraPaymentAmount = Math.min(availableBudget, d.balance);
        d.balance -= extraPaymentAmount;
        availableBudget -= extraPaymentAmount;
        
        if (d.balance <= 0.01) {
          d.balance = 0;
          d.paidOff = true;
          d.payoffMonth = month;
        }
        break;
      }
      
      // Record monthly progress (every month for short periods, every 3 months for long)
      if (month <= 12 || month % 3 === 0) {
        timelineData.push({
          month,
          totalBalance: Math.max(0, debtBalances.reduce((s, d) => s + d.balance, 0)),
          label: month.toString(),
        });
      }
    }
    
    // Ensure final point
    if (timelineData[timelineData.length - 1]?.month !== month) {
      timelineData.push({
        month,
        totalBalance: 0,
        label: month.toString(),
      });
    }
    
    let baselineInterest = 0;
    debts.forEach(d => {
      const months = Math.ceil(d.remainingAmount / d.monthlyPayment);
      baselineInterest += (d.interestRate / 100 / 12) * d.remainingAmount * months * 0.5;
    });
    
    const interestSaved = Math.max(0, baselineInterest - totalInterestPaid);
    const payoffDate = new Date();
    payoffDate.setMonth(payoffDate.getMonth() + month);

    return {
      orderedDebts: debtBalances,
      totalMonths: month,
      payoffDate: payoffDate.toISOString().slice(0, 7),
      interestSaved,
      totalInterestPaid,
      timelineData,
    };
  }, [sortedDebts, extraPayment, debts]);

  const totalDebt = debts.reduce((sum, d) => sum + d.remainingAmount, 0);

  return (
    <div className="pb-24 px-4 pt-2 safe-top">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveScreen("home")} className="text-2xl">←</button>
          <h1 className="text-xl font-bold text-foreground">{t.title}</h1>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddModal(true)}
          className="p-2 rounded-full bg-primary text-primary-foreground"
        >
          <Plus className="w-5 h-5" />
        </motion.button>
      </header>

      {debts.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          <TrendingDown className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="mb-2">{t.noDebts}</p>
          <p className="text-sm">{t.addDebts}</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium"
          >
            {t.addDebt}
          </button>
        </div>
      ) : (
        <>
          {/* Strategy Selector */}
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">{t.strategy}</h2>
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setStrategy("snowball")}
                className={`p-4 rounded-2xl border-2 text-left ${
                  strategy === "snowball" 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border bg-card'
                }`}
              >
                <Snowflake className={`w-6 h-6 mb-2 ${strategy === "snowball" ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className="font-semibold text-foreground">{t.snowball}</p>
                <p className="text-xs text-muted-foreground mt-1">{t.snowballDesc}</p>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setStrategy("avalanche")}
                className={`p-4 rounded-2xl border-2 text-left ${
                  strategy === "avalanche" 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border bg-card'
                }`}
              >
                <Zap className={`w-6 h-6 mb-2 ${strategy === "avalanche" ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className="font-semibold text-foreground">{t.avalanche}</p>
                <p className="text-xs text-muted-foreground mt-1">{t.avalancheDesc}</p>
              </motion.button>
            </div>
          </section>

          {/* Extra Payment Input */}
          <section className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">{t.extraPayment}</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={extraPayment}
                onChange={e => setExtraPayment(e.target.value)}
                placeholder="0"
                className="flex-1 p-3 rounded-xl bg-secondary border border-border text-foreground"
              />
              <span className="text-muted-foreground">{t.perMonth}</span>
            </div>
          </section>

          {/* Summary Cards */}
          {payoffPlan && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-expense/10 border border-expense/20"
              >
                <TrendingDown className="w-5 h-5 text-expense mb-2" />
                <p className="text-xs text-muted-foreground">{t.totalDebt}</p>
                <p className="text-lg font-bold text-expense">{formatCurrency(totalDebt, currency)}</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-4 rounded-2xl bg-primary/10 border border-primary/20"
              >
                <Calendar className="w-5 h-5 text-primary mb-2" />
                <p className="text-xs text-muted-foreground">{t.payoffDate}</p>
                <p className="text-lg font-bold text-foreground">{payoffPlan.payoffDate}</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-4 rounded-2xl bg-income/10 border border-income/20"
              >
                <Target className="w-5 h-5 text-income mb-2" />
                <p className="text-xs text-muted-foreground">{t.interestSaved}</p>
                <p className="text-lg font-bold text-income">{formatCurrency(payoffPlan.interestSaved, currency)}</p>
              </motion.div>
            </div>
          )}

          {/* Payoff Timeline Chart */}
          {payoffPlan && payoffPlan.timelineData.length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-4 rounded-2xl bg-card border border-border mb-6"
            >
              <h3 className="text-sm font-semibold text-foreground mb-3">{t.timeline}</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={payoffPlan.timelineData}>
                    <defs>
                      <linearGradient id="debtGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--expense))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(var(--expense))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="label" 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      interval="preserveStartEnd"
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
                      formatter={(value: number) => [formatCurrency(value, currency), t.remaining]}
                      labelFormatter={(label) => `${label} ${t.months}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="totalBalance"
                      stroke="hsl(var(--expense))"
                      strokeWidth={2}
                      fill="url(#debtGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {/* Payoff Order */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">{t.order}</h2>
            <div className="space-y-3">
              {payoffPlan?.orderedDebts.map((debt, index) => (
                <motion.div
                  key={debt.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 rounded-2xl bg-card border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{debt.name}</p>
                      <p className="text-sm text-muted-foreground">{debt.lender}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">{formatCurrency(debt.remainingAmount, currency)}</p>
                      <p className="text-sm text-muted-foreground">{debt.interestRate}% {t.rate}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteDebt(debt.id)}
                      className="p-2 rounded-lg bg-destructive/10 text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {debt.payoffMonth > 0 && (
                    <div className="mt-3 pt-3 border-t border-border flex justify-between text-sm">
                      <span className="text-muted-foreground">{t.monthlyMin}: {formatCurrency(debt.monthlyPayment, currency)}</span>
                      <span className="text-income font-medium">
                        {lang === "ru" ? "Погашен через" : lang === "uz" ? "To'lanadi" : "Paid off in"} {debt.payoffMonth} {t.months}
                      </span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* Add Debt Modal */}
      {showAddModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
          onClick={() => setShowAddModal(false)}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            onClick={e => e.stopPropagation()}
            className="bg-background rounded-t-3xl p-6 w-full max-w-lg"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{t.addDebt}</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{t.debtName}</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Credit Card, Auto Loan..."
                  className="w-full p-3 rounded-xl bg-secondary border border-border text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{t.lender}</label>
                <input
                  type="text"
                  value={formLender}
                  onChange={e => setFormLender(e.target.value)}
                  placeholder="Bank, Company..."
                  className="w-full p-3 rounded-xl bg-secondary border border-border text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{t.balance}</label>
                <input
                  type="number"
                  value={formAmount}
                  onChange={e => setFormAmount(e.target.value)}
                  placeholder="0"
                  className="w-full p-3 rounded-xl bg-secondary border border-border text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t.interestRate}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formInterest}
                    onChange={e => setFormInterest(e.target.value)}
                    placeholder="15"
                    className="w-full p-3 rounded-xl bg-secondary border border-border text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t.minPayment}</label>
                  <input
                    type="number"
                    value={formMinPayment}
                    onChange={e => setFormMinPayment(e.target.value)}
                    placeholder="0"
                    className="w-full p-3 rounded-xl bg-secondary border border-border text-foreground"
                  />
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleAddDebt}
                disabled={!formName || !formAmount || !formInterest || !formMinPayment}
                className="w-full p-4 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-50"
              >
                {t.save}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
});

export default DebtPayoffScreen;
