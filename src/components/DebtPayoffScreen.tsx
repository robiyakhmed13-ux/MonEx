import React, { useState, useMemo, memo } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { DebtItem } from "@/types";
import { safeJSON } from "@/lib/storage";
import { formatCurrency } from "@/lib/exportData";
import { TrendingDown, Calendar, Target, Zap, Snowflake } from "lucide-react";

export const DebtPayoffScreen = memo(() => {
  const { lang, currency, setActiveScreen } = useApp();
  const [debts, setDebts] = useState<DebtItem[]>(() => safeJSON.get("hamyon_debts", []));
  const [strategy, setStrategy] = useState<"snowball" | "avalanche">("avalanche");
  const [extraPayment, setExtraPayment] = useState("");

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
    addDebts: lang === "ru" ? "Добавьте долги в разделе Qarz" : lang === "uz" ? "Qarz bo'limiga qarz qo'shing" : "Add debts in Debt section",
    remaining: lang === "ru" ? "Остаток" : lang === "uz" ? "Qoldiq" : "Remaining",
    rate: lang === "ru" ? "Ставка" : lang === "uz" ? "Stavka" : "Rate",
    monthlyMin: lang === "ru" ? "Мин. платёж" : lang === "uz" ? "Min. to'lov" : "Min. Payment",
  };

  // Sort debts by strategy
  const sortedDebts = useMemo(() => {
    const debtsCopy = [...debts];
    if (strategy === "snowball") {
      // Smallest balance first
      return debtsCopy.sort((a, b) => a.remainingAmount - b.remainingAmount);
    } else {
      // Highest interest rate first
      return debtsCopy.sort((a, b) => b.interestRate - a.interestRate);
    }
  }, [debts, strategy]);

  // Calculate payoff schedule
  const payoffPlan = useMemo(() => {
    if (debts.length === 0) return null;

    const extra = parseFloat(extraPayment) || 0;
    const totalMinPayment = debts.reduce((sum, d) => sum + d.monthlyPayment, 0);
    const totalMonthlyBudget = totalMinPayment + extra;
    
    // Simulate payoff
    let debtBalances = sortedDebts.map(d => ({
      ...d,
      balance: d.remainingAmount,
      paidOff: false,
      payoffMonth: 0,
    }));
    
    let month = 0;
    let totalInterestPaid = 0;
    const maxMonths = 360; // 30 years max
    
    while (debtBalances.some(d => !d.paidOff) && month < maxMonths) {
      month++;
      let availableBudget = totalMonthlyBudget;
      
      // First, make minimum payments on all debts
      debtBalances.forEach(d => {
        if (d.paidOff) return;
        
        // Add interest
        const monthlyInterest = (d.interestRate / 100 / 12) * d.balance;
        d.balance += monthlyInterest;
        totalInterestPaid += monthlyInterest;
        
        // Make minimum payment
        const payment = Math.min(d.monthlyPayment, d.balance);
        d.balance -= payment;
        availableBudget -= payment;
        
        if (d.balance <= 0.01) {
          d.balance = 0;
          d.paidOff = true;
          d.payoffMonth = month;
        }
      });
      
      // Apply extra payment to first unpaid debt (according to strategy)
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
        break; // Only apply extra to first debt
      }
    }
    
    // Calculate interest without extra payments
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
    };
  }, [sortedDebts, extraPayment, debts]);

  const totalDebt = debts.reduce((sum, d) => sum + d.remainingAmount, 0);

  return (
    <div className="pb-24 px-4 pt-2 safe-top">
      {/* Header */}
      <header className="flex items-center gap-3 mb-6">
        <button onClick={() => setActiveScreen("home")} className="text-2xl">←</button>
        <h1 className="text-xl font-bold text-foreground">{t.title}</h1>
      </header>

      {debts.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          <TrendingDown className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="mb-2">{t.noDebts}</p>
          <p className="text-sm">{t.addDebts}</p>
          <button
            onClick={() => setActiveScreen("debt-assessment")}
            className="mt-4 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium"
          >
            {lang === "ru" ? "Добавить долги" : lang === "uz" ? "Qarz qo'shish" : "Add Debts"}
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

          {/* Extra Payment */}
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
                  </div>
                  {debt.payoffMonth > 0 && (
                    <div className="mt-3 pt-3 border-t border-border flex justify-between text-sm">
                      <span className="text-muted-foreground">{t.monthlyMin}: {formatCurrency(debt.monthlyPayment, currency)}</span>
                      <span className="text-income font-medium">
                        {lang === "ru" ? "Погашен через" : lang === "uz" ? "To'lanadi" : "Paid off in"} {debt.payoffMonth} {lang === "ru" ? "мес" : lang === "uz" ? "oy" : "mo"}
                      </span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
});

export default DebtPayoffScreen;
