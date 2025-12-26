import React from "react";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { formatUZS, clamp } from "@/lib/storage";

export const HomeScreen: React.FC<{ onAddExpense: () => void; onAddIncome: () => void }> = ({ onAddExpense, onAddIncome }) => {
  const { 
    t, tgUser, balance, todayExp, todayInc, weekSpend, monthSpend, 
    limits, monthSpentByCategory, getCat, catLabel, 
    transactions, setActiveScreen, syncFromRemote, useRemote
  } = useApp();
  
  return (
    <div className="pb-24 px-4 pt-2 safe-top">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
            {(tgUser?.first_name || "U").charAt(0)}
          </div>
          <div>
            <p className="text-body-sm text-muted-foreground">{t.hello}</p>
            <p className="font-semibold text-foreground">{tgUser?.first_name || "User"}</p>
          </div>
        </div>
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={syncFromRemote}
          className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
        >
          <span className="text-lg">🔄</span>
        </motion.button>
      </header>
      
      {/* Balance Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-elevated-lg p-6 mb-6"
      >
        <p className="text-body-sm text-muted-foreground mb-1">{t.balance}</p>
        <div className="flex items-baseline gap-2 mb-4">
          <h1 className="text-display text-foreground">{formatUZS(balance)}</h1>
          <span className="text-body-sm text-muted-foreground font-medium">UZS</span>
        </div>
        
        {/* Today's summary */}
        <div className="flex gap-4">
          <div className="flex-1 p-3 rounded-xl bg-red-50">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 rounded-full bg-expense/20 flex items-center justify-center text-xs">↓</span>
              <span className="text-caption text-muted-foreground">{t.expenses}</span>
            </div>
            <p className="text-title-3 amount-expense">
              {todayExp ? `-${formatUZS(todayExp)}` : "0"}
            </p>
          </div>
          <div className="flex-1 p-3 rounded-xl bg-green-50">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 rounded-full bg-income/20 flex items-center justify-center text-xs">↑</span>
              <span className="text-caption text-muted-foreground">{t.income}</span>
            </div>
            <p className="text-title-3 amount-income">
              {todayInc ? `+${formatUZS(todayInc)}` : "0"}
            </p>
          </div>
        </div>
      </motion.div>
      
      {/* Quick Actions */}
      <div className="flex gap-3 mb-6">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onAddExpense}
          className="flex-1 quick-action"
        >
          <span className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-expense text-xl">↓</span>
          <span className="text-body-sm font-medium text-foreground">{t.addExpense}</span>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onAddIncome}
          className="flex-1 quick-action"
        >
          <span className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-income text-xl">↑</span>
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
            {limits.slice(0, 4).map((lim) => {
              const cat = getCat(lim.categoryId);
              const spent = monthSpentByCategory(lim.categoryId);
              const pct = lim.amount ? Math.round((spent / lim.amount) * 100) : 0;
              const isOver = pct >= 100;
              
              return (
                <div key={lim.id} className="min-w-[100px] flex flex-col items-center">
                  <div className="relative mb-2">
                    <div 
                      className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
                      style={{ 
                        background: `conic-gradient(${isOver ? 'hsl(var(--expense))' : cat.color} ${clamp(pct, 0, 100)}%, hsl(var(--secondary)) 0%)`,
                      }}
                    >
                      <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center">
                        {cat.emoji}
                      </div>
                    </div>
                    {isOver && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-expense rounded-full flex items-center justify-center">
                        <span className="text-2xs text-white">!</span>
                      </div>
                    )}
                  </div>
                  <p className="text-body-sm font-medium text-foreground text-center">{catLabel(cat)}</p>
                  <p className="text-caption text-muted-foreground">
                    ${formatUZS(spent)} / ${formatUZS(lim.amount)}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}
      
      {/* Quick Add */}
      <section className="mb-6">
        <h2 className="text-title-3 text-foreground mb-3">{t.quickAdd}</h2>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {[
            { emoji: "☕", label: "Coffee", amount: 15000 },
            { emoji: "🍽️", label: "Lunch", amount: 35000 },
            { emoji: "🚕", label: "Transport", amount: 20000 },
            { emoji: "🛒", label: "Shopping", amount: 100000 },
          ].map((item, i) => (
            <motion.button
              key={i}
              whileTap={{ scale: 0.95 }}
              onClick={onAddExpense}
              className={`min-w-[90px] p-4 rounded-2xl border-2 transition-all ${i === 0 ? 'border-primary bg-accent' : 'border-border bg-card'}`}
            >
              <span className="text-2xl block mb-2">{item.emoji}</span>
              <p className="text-body-sm font-medium text-foreground">{item.label}</p>
              <p className="text-caption text-muted-foreground">{formatUZS(item.amount)}</p>
            </motion.button>
          ))}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onAddExpense}
            className="min-w-[90px] p-4 rounded-2xl border-2 border-dashed border-border bg-secondary flex flex-col items-center justify-center"
          >
            <span className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-primary text-xl mb-2">+</span>
            <p className="text-body-sm font-medium text-muted-foreground">Custom</p>
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
          <div className="card-elevated p-8 text-center">
            <span className="text-5xl block mb-3">💳</span>
            <p className="text-muted-foreground">{t.empty}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 5).map((tx) => {
              const cat = getCat(tx.categoryId);
              return (
                <motion.div 
                  key={tx.id}
                  whileTap={{ scale: 0.99 }}
                  className="list-item"
                >
                  <div 
                    className="category-icon"
                    style={{ backgroundColor: `${cat.color}20` }}
                  >
                    {cat.emoji}
                  </div>
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
