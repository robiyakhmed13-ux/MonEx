import React, { useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { formatUZS, clamp, todayISO } from "@/lib/storage";
import { VoiceInput } from "./VoiceInput";
import { CategoryIcon } from "./CategoryIcon";
import { 
  RefreshCw, ArrowDown, ArrowUp, Lightbulb, Plus,
  CreditCard, PieChart, Tv, Users, TrendingUp, FileText
} from "lucide-react";

export const HomeScreen: React.FC<{ onAddExpense: () => void; onAddIncome: () => void }> = ({ onAddExpense, onAddIncome }) => {
  const { 
    t, lang, tgUser, balance, todayExp, todayInc, weekSpend, monthSpend, 
    limits, monthSpentByCategory, getCat, catLabel, addTransaction,
    transactions, setActiveScreen, syncFromRemote, quickAdds
  } = useApp();
  
  // Calculate last week's spending for comparison
  const { lastWeekSpend, weekChange, smartTip } = useMemo(() => {
    const today = new Date();
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());
    
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
    
    const lastWeekStartStr = lastWeekStart.toISOString().slice(0, 10);
    const lastWeekEndStr = lastWeekEnd.toISOString().slice(0, 10);
    
    let lastWeek = 0;
    const categorySpend: Record<string, number> = {};
    
    transactions.forEach(tx => {
      if (tx.amount < 0) {
        if (tx.date >= lastWeekStartStr && tx.date <= lastWeekEndStr) {
          lastWeek += Math.abs(tx.amount);
        }
        const month = new Date().toISOString().slice(0, 7);
        if (tx.date.startsWith(month)) {
          categorySpend[tx.categoryId] = (categorySpend[tx.categoryId] || 0) + Math.abs(tx.amount);
        }
      }
    });
    
    const change = lastWeek > 0 ? ((weekSpend - lastWeek) / lastWeek) * 100 : 0;
    
    // Find top spending category
    let topCat = "";
    let topAmount = 0;
    Object.entries(categorySpend).forEach(([id, amount]) => {
      if (amount > topAmount) {
        topCat = id;
        topAmount = amount;
      }
    });
    
    // Generate smart tip
    let tip = "";
    if (change > 20) {
      tip = lang === "ru" ? "Расходы выше обычного. Попробуйте сократить траты" : 
            lang === "uz" ? "Xarajatlar odatdagidan yuqori. Kamroq sarflang" :
            "Spending is higher than usual. Try to cut back";
    } else if (change < -10) {
      tip = lang === "ru" ? "Отлично! Вы экономите больше обычного" :
            lang === "uz" ? "Ajoyib! Siz odatdagidan ko'proq tejayapsiz" :
            "Great job! You're saving more than usual";
    } else if (topCat && topAmount > monthSpend * 0.4) {
      const cat = getCat(topCat);
      tip = lang === "ru" ? `${catLabel(cat)} составляет 40%+ расходов` :
            lang === "uz" ? `${catLabel(cat)} xarajatlarning 40%+` :
            `${catLabel(cat)} is 40%+ of your spending`;
    } else {
      tip = lang === "ru" ? "Продолжайте отслеживать расходы!" :
            lang === "uz" ? "Xarajatlarni kuzatishda davom eting!" :
            "Keep tracking your spending!";
    }
    
    return { lastWeekSpend: lastWeek, weekChange: change, smartTip: tip };
  }, [transactions, weekSpend, monthSpend, getCat, catLabel, lang]);
  
  // Quick add handler
  const handleQuickAdd = useCallback(async (categoryId: string, amount: number) => {
    const cat = getCat(categoryId);
    const now = new Date();
    await addTransaction({
      type: "expense",
      amount: -Math.abs(amount),
      categoryId,
      description: cat.uz || cat.en,
      date: todayISO(),
      time: now.toISOString().slice(11, 16),
      source: "quick",
    });
  }, [getCat, addTransaction]);
  
  // Voice input handler
  const handleVoiceTransaction = useCallback(async (data: { type: "expense" | "income"; categoryId: string; amount: number; description: string }) => {
    const now = new Date();
    await addTransaction({
      type: data.type,
      amount: data.type === "expense" ? -Math.abs(data.amount) : Math.abs(data.amount),
      categoryId: data.categoryId,
      description: data.description,
      date: todayISO(),
      time: now.toISOString().slice(11, 16),
      source: "voice",
    });
  }, [addTransaction]);

  const defaultQuickAdds = [
    { id: "coffee", categoryId: "coffee", amount: 15000 },
    { id: "restaurants", categoryId: "restaurants", amount: 35000 },
    { id: "taxi", categoryId: "taxi", amount: 20000 },
    { id: "shopping", categoryId: "shopping", amount: 100000 },
  ];
  
  return (
    <div className="pb-24 px-4 pt-2 safe-top">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <motion.div 
            className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-blue-600 text-primary-foreground flex items-center justify-center font-bold text-lg"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {(tgUser?.first_name || "U").charAt(0)}
          </motion.div>
          <div>
            <p className="text-body-sm text-muted-foreground">{t.hello}</p>
            <p className="font-semibold text-foreground">{tgUser?.first_name || "User"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <VoiceInput onTransactionParsed={handleVoiceTransaction} />
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={syncFromRemote}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
          >
            <RefreshCw className="w-5 h-5 text-muted-foreground" />
          </motion.button>
        </div>
      </header>
      
      {/* Balance Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-elevated-lg p-6 mb-4"
      >
        <p className="text-body-sm text-muted-foreground mb-1">{t.balance}</p>
        <div className="flex items-baseline gap-2 mb-4">
          <h1 className="text-display text-foreground">{formatUZS(balance)}</h1>
          <span className="text-body-sm text-muted-foreground font-medium">UZS</span>
        </div>
        
        {/* Today's summary */}
        <div className="flex gap-4">
          <div className="flex-1 p-3 rounded-xl bg-red-50 dark:bg-red-950/30">
            <div className="flex items-center gap-2 mb-1">
              <motion.div 
                className="w-6 h-6 rounded-full bg-expense/20 flex items-center justify-center"
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ArrowDown className="w-3.5 h-3.5 text-expense" />
              </motion.div>
              <span className="text-caption text-muted-foreground">{t.expenses}</span>
            </div>
            <p className="text-title-3 amount-expense">
              {todayExp ? `-${formatUZS(todayExp)}` : "0"}
            </p>
          </div>
          <div className="flex-1 p-3 rounded-xl bg-green-50 dark:bg-green-950/30">
            <div className="flex items-center gap-2 mb-1">
              <motion.div 
                className="w-6 h-6 rounded-full bg-income/20 flex items-center justify-center"
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
              >
                <ArrowUp className="w-3.5 h-3.5 text-income" />
              </motion.div>
              <span className="text-caption text-muted-foreground">{t.income}</span>
            </div>
            <p className="text-title-3 amount-income">
              {todayInc ? `+${formatUZS(todayInc)}` : "0"}
            </p>
          </div>
        </div>
      </motion.div>
      
      {/* Smart Insights Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-accent to-primary/5 border border-primary/20"
      >
        <div className="flex items-start gap-3">
          <motion.div 
            className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Lightbulb className="w-5 h-5 text-primary" />
          </motion.div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-foreground">
                {t.weekSpending}
              </span>
              {weekChange !== 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    weekChange > 0 
                      ? 'bg-expense/20 text-expense' 
                      : 'bg-income/20 text-income'
                  }`}
                >
                  {weekChange > 0 ? '↑' : '↓'} {Math.abs(weekChange).toFixed(0)}%
                </motion.span>
              )}
            </div>
            <p className="text-2xl font-bold text-foreground mb-1">
              {formatUZS(weekSpend)} <span className="text-sm font-normal text-muted-foreground">UZS</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {smartTip}
            </p>
          </div>
        </div>
        
        {/* Mini comparison bars */}
        <div className="mt-3 pt-3 border-t border-primary/10">
          <div className="flex items-center gap-3 text-xs">
            <div className="flex-1">
              <div className="flex justify-between mb-1">
                <span className="text-muted-foreground">{t.week}</span>
                <span className="font-medium text-foreground">{formatUZS(weekSpend)}</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((weekSpend / (Math.max(weekSpend, lastWeekSpend) || 1)) * 100, 100)}%` }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex justify-between mb-1">
                <span className="text-muted-foreground">{lang === "ru" ? "Прош." : lang === "uz" ? "O'tgan" : "Last"}</span>
                <span className="font-medium text-muted-foreground">{formatUZS(lastWeekSpend)}</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-muted-foreground/50 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((lastWeekSpend / (Math.max(weekSpend, lastWeekSpend) || 1)) * 100, 100)}%` }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Quick Actions */}
      <div className="flex gap-3 mb-6">
        <motion.button
          whileTap={{ scale: 0.97 }}
          whileHover={{ scale: 1.02 }}
          onClick={onAddExpense}
          className="flex-1 quick-action group"
        >
          <motion.div 
            className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center"
            whileHover={{ y: -2 }}
          >
            <ArrowDown className="w-5 h-5 text-expense" />
          </motion.div>
          <span className="text-body-sm font-medium text-foreground">{t.addExpense}</span>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          whileHover={{ scale: 1.02 }}
          onClick={onAddIncome}
          className="flex-1 quick-action group"
        >
          <motion.div 
            className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-950/50 flex items-center justify-center"
            whileHover={{ y: -2 }}
          >
            <ArrowUp className="w-5 h-5 text-income" />
          </motion.div>
          <span className="text-body-sm font-medium text-foreground">{t.addIncome}</span>
        </motion.button>
      </div>
      
      {/* Monthly Budgets */}
      {limits.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-title-3 text-foreground">{t.monthlyBudgets}</h2>
            <button 
              onClick={() => setActiveScreen("limits")} 
              className="text-body-sm text-primary font-medium"
            >
              {t.viewAll}
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {limits.slice(0, 4).map((lim, index) => {
              const cat = getCat(lim.categoryId);
              const spent = monthSpentByCategory(lim.categoryId);
              const pct = lim.amount ? Math.round((spent / lim.amount) * 100) : 0;
              const isOver = pct >= 100;
              
              return (
                <motion.div 
                  key={lim.id} 
                  className="min-w-[100px] flex flex-col items-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="relative mb-2">
                    <motion.div 
                      className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{ 
                        background: `conic-gradient(${isOver ? 'hsl(var(--expense))' : cat.color} ${clamp(pct, 0, 100)}%, hsl(var(--secondary)) 0%)`,
                      }}
                      animate={isOver ? { scale: [1, 1.05, 1] } : {}}
                      transition={{ duration: 0.5, repeat: isOver ? Infinity : 0, repeatDelay: 1 }}
                    >
                      <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center">
                        <CategoryIcon categoryId={cat.id} className="w-5 h-5" style={{ color: cat.color }} />
                      </div>
                    </motion.div>
                    {isOver && (
                      <motion.div 
                        className="absolute -top-1 -right-1 w-5 h-5 bg-expense rounded-full flex items-center justify-center"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                      >
                        <span className="text-2xs text-white font-bold">!</span>
                      </motion.div>
                    )}
                  </div>
                  <p className="text-body-sm font-medium text-foreground text-center">{catLabel(cat)}</p>
                  <p className="text-caption text-muted-foreground">
                    {formatUZS(spent)} / {formatUZS(lim.amount)}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}
      
      {/* Quick Add */}
      <section className="mb-6">
        <h2 className="text-title-3 text-foreground mb-3">{t.quickAdd}</h2>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {(quickAdds.length > 0 ? quickAdds : defaultQuickAdds).map((item, i) => {
            const cat = getCat(item.categoryId);
            return (
              <motion.button
                key={i}
                whileTap={{ scale: 0.95 }}
                whileHover={{ y: -4 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleQuickAdd(item.categoryId, item.amount)}
                className={`min-w-[90px] p-4 rounded-2xl border-2 transition-all ${i === 0 ? 'border-primary bg-accent' : 'border-border bg-card hover:border-primary/50'}`}
              >
                <motion.div 
                  className="w-10 h-10 mx-auto mb-2 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: cat.color + "20" }}
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.2 }}
                >
                  <CategoryIcon categoryId={cat.id} className="w-5 h-5" style={{ color: cat.color }} />
                </motion.div>
                <p className="text-body-sm font-medium text-foreground">{catLabel(cat)}</p>
                <p className="text-caption text-muted-foreground">{formatUZS(item.amount)}</p>
              </motion.button>
            );
          })}
          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ y: -4 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={onAddExpense}
            className="min-w-[90px] p-4 rounded-2xl border-2 border-dashed border-border bg-secondary flex flex-col items-center justify-center hover:border-primary/50"
          >
            <motion.div 
              className="w-10 h-10 rounded-full bg-accent flex items-center justify-center mb-2"
              whileHover={{ rotate: 90 }}
              transition={{ duration: 0.2 }}
            >
              <Plus className="w-5 h-5 text-primary" />
            </motion.div>
            <p className="text-body-sm font-medium text-muted-foreground">{t.add}</p>
          </motion.button>
        </div>
      </section>

      {/* Quick Access to New Features */}
      <section className="mb-6">
        <h2 className="text-title-3 text-foreground mb-3">
          {lang === "ru" ? "Инструменты" : lang === "uz" ? "Asboblar" : "Tools"}
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ y: -2 }}
            onClick={() => setActiveScreen("accounts")}
            className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/20 flex flex-col items-center gap-2"
          >
            <CreditCard className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            <span className="text-xs font-medium text-foreground">
              {lang === "ru" ? "Счета" : lang === "uz" ? "Hisoblar" : "Accounts"}
            </span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ y: -2 }}
            onClick={() => setActiveScreen("debt-assessment")}
            className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20 flex flex-col items-center gap-2"
          >
            <PieChart className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-medium text-foreground">
              {lang === "ru" ? "Долги" : lang === "uz" ? "Qarzlar" : "Debt"}
            </span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ y: -2 }}
            onClick={() => setActiveScreen("subscriptions")}
            className="p-4 rounded-2xl bg-gradient-to-br from-pink-500/20 to-rose-500/10 border border-pink-500/20 flex flex-col items-center gap-2"
          >
            <Tv className="w-6 h-6 text-pink-600 dark:text-pink-400" />
            <span className="text-xs font-medium text-foreground">
              {lang === "ru" ? "Подписки" : lang === "uz" ? "Obunalar" : "Subs"}
            </span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ y: -2 }}
            onClick={() => setActiveScreen("bill-split")}
            className="p-4 rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-500/10 border border-teal-500/20 flex flex-col items-center gap-2"
          >
            <Users className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            <span className="text-xs font-medium text-foreground">
              {lang === "ru" ? "Делить" : lang === "uz" ? "Bo'lish" : "Split"}
            </span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ y: -2 }}
            onClick={() => setActiveScreen("net-worth")}
            className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-500/10 border border-indigo-500/20 flex flex-col items-center gap-2"
          >
            <TrendingUp className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-medium text-foreground">
              {lang === "ru" ? "Капитал" : lang === "uz" ? "Boylik" : "Worth"}
            </span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ y: -2 }}
            onClick={() => setActiveScreen("reports")}
            className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 border border-violet-500/20 flex flex-col items-center gap-2"
          >
            <FileText className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            <span className="text-xs font-medium text-foreground">
              {lang === "ru" ? "Отчёты" : lang === "uz" ? "Hisobotlar" : "Reports"}
            </span>
          </motion.button>
        </div>
      </section>
      
      {/* Recent Transactions */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-title-3 text-foreground">{t.allTransactions}</h2>
          <button 
            onClick={() => setActiveScreen("transactions")} 
            className="text-body-sm text-primary font-medium"
          >
            {t.viewAll}
          </button>
        </div>
        
        {transactions.length === 0 ? (
          <motion.div 
            className="card-elevated p-8 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <motion.div 
              className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-secondary flex items-center justify-center"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <CreditCard className="w-8 h-8 text-muted-foreground" />
            </motion.div>
            <p className="text-muted-foreground">{t.empty}</p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 5).map((tx, index) => {
              const cat = getCat(tx.categoryId);
              return (
                <motion.div 
                  key={tx.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileTap={{ scale: 0.99 }}
                  className="list-item"
                >
                  <motion.div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${cat.color}20` }}
                    whileHover={{ scale: 1.1 }}
                  >
                    <CategoryIcon categoryId={cat.id} className="w-5 h-5" style={{ color: cat.color }} />
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{tx.description}</p>
                    <p className="text-caption text-muted-foreground">{tx.date}</p>
                  </div>
                  <p className={`font-semibold ${tx.amount > 0 ? 'amount-income' : 'amount-expense'}`}>
                    {tx.amount > 0 ? '+' : ''}{formatUZS(tx.amount)}
                  </p>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
