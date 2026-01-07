import React, { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { formatUZS, clamp, todayISO, safeJSON } from "@/lib/storage";
import { VoiceInput } from "./VoiceInput";
import { CategoryIcon } from "./CategoryIcon";
import { AICopilotPanel } from "./AICopilotPanel";
import { AIInsightsWidget } from "./AIInsightsWidget";
import { FinancePlannerModal } from "./FinancePlannerModal";
import { BudgetSimulatorModal } from "./BudgetSimulatorModal";
import { 
  RefreshCw, ArrowDown, ArrowUp, Plus,
  ChevronUp, ChevronDown, X, Check, TrendingUp, Pencil
} from "lucide-react";

// Premium animations: fade-in, slide-up only (iOS-approved, no bounce)
const fadeIn = { opacity: 0 };
const fadeInTo = { opacity: 1 };
const slideUp = { opacity: 0, y: 8 };
const slideUpTo = { opacity: 1, y: 0 };
const motionConfig = { duration: 0.2, ease: "easeOut" };

export const HomeScreen: React.FC<{ onAddExpense: () => void; onAddIncome: () => void }> = ({ onAddExpense, onAddIncome }) => {
  const { 
    t, lang, tgUser, balance, todayExp, todayInc, weekSpend, monthSpend, 
    limits, monthSpentByCategory, getCat, catLabel, addTransaction,
    transactions, setActiveScreen, syncFromRemote, quickAdds
  } = useApp();
  
  // Calculate spending comparison
  const { lastWeekSpend, weekChange } = useMemo(() => {
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
    transactions.forEach(tx => {
      if (tx.amount < 0 && tx.date >= lastWeekStartStr && tx.date <= lastWeekEndStr) {
        lastWeek += Math.abs(tx.amount);
      }
    });
    
    const change = lastWeek > 0 ? ((weekSpend - lastWeek) / lastWeek) * 100 : 0;
    return { lastWeekSpend: lastWeek, weekChange: change };
  }, [transactions, weekSpend]);
  
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

  // Quick adds
  const defaultQuickAdds = [
    { id: "coffee", categoryId: "coffee", amount: 15000 },
    { id: "restaurants", categoryId: "restaurants", amount: 35000 },
    { id: "taxi", categoryId: "taxi", amount: 20000 },
    { id: "shopping", categoryId: "shopping", amount: 100000 },
  ];

  const [editingQuickAdd, setEditingQuickAdd] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [localQuickAdds, setLocalQuickAdds] = useState<typeof defaultQuickAdds>(() => {
    const saved = safeJSON.get<typeof defaultQuickAdds>("hamyon_quickAdds", []);
    return saved.length > 0 ? saved : quickAdds.length > 0 ? quickAdds : defaultQuickAdds;
  });

  const handleSaveQuickAdd = (itemId: string) => {
    const newAmount = parseInt(editAmount) || 0;
    if (newAmount > 0) {
      const updated = localQuickAdds.map(item => 
        item.id === itemId ? { ...item, amount: newAmount } : item
      );
      setLocalQuickAdds(updated);
      safeJSON.set("hamyon_quickAdds", updated);
    }
    setEditingQuickAdd(null);
  };

  const stepAmount = (delta: number) => {
    const current = parseInt(editAmount) || 0;
    const step = current >= 100000 ? 10000 : 5000;
    setEditAmount(Math.max(1000, current + delta * step).toString());
  };

  // Modals
  const [showAICopilot, setShowAICopilot] = useState(false);
  const [showFinancePlanner, setShowFinancePlanner] = useState(false);
  const [showBudgetSimulator, setShowBudgetSimulator] = useState(false);

  // Refresh handler for pull-to-refresh
  const handleRefresh = useCallback(async () => {
    await syncFromRemote();
  }, [syncFromRemote]);
  

  return (
    <>
    <div className="screen-container">
      {/* === MINIMAL HEADER === */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <VoiceInput onTransactionParsed={handleVoiceTransaction} />
        </div>
        <button 
          onClick={syncFromRemote}
          className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center active:opacity-70 transition-opacity"
        >
          <RefreshCw className="w-5 h-5 text-muted-foreground" />
        </button>
      </header>
      
      {/* === HERO: Balance Card === */}
      <motion.div 
        initial={slideUp}
        animate={slideUpTo}
        transition={motionConfig}
        className="card-hero mb-card"
      >
        <p className="text-caption mb-2">{t.balance}</p>
        <div className="flex items-baseline gap-2">
          <span className="card-hero-number">{formatUZS(balance)}</span>
          <span className="text-caption">UZS</span>
        </div>
      </motion.div>
      
      {/* === Today's Flow === */}
      <div className="grid grid-cols-2 gap-card mb-card">
        <motion.div 
          initial={slideUp}
          animate={slideUpTo}
          transition={{ ...motionConfig, delay: 0.03 }}
          className="card-info"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center">
              <ArrowDown className="w-3.5 h-3.5 text-destructive" />
            </div>
            <span className="text-caption">{t.expenses}</span>
          </div>
          <p className="text-title amount-expense">
            {todayExp ? `-${formatUZS(todayExp)}` : "0"}
          </p>
        </motion.div>
        
        <motion.div 
          initial={slideUp}
          animate={slideUpTo}
          transition={{ ...motionConfig, delay: 0.06 }}
          className="card-info"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-[hsl(var(--income))]/10 flex items-center justify-center">
              <ArrowUp className="w-3.5 h-3.5 text-[hsl(var(--income))]" />
            </div>
            <span className="text-caption">{t.income}</span>
          </div>
          <p className="text-title amount-income">
            {todayInc ? `+${formatUZS(todayInc)}` : "0"}
          </p>
        </motion.div>
      </div>

      {/* === AI Insight (Only Critical/High) === */}
      <div className="mb-card">
        <AIInsightsWidget onOpenFullPanel={() => setShowAICopilot(true)} />
      </div>
      
      {/* === Quick Add === */}
      <section className="mb-card">
        <div className="flex gap-card overflow-x-auto no-scrollbar pb-1">
          {localQuickAdds.map((item, i) => {
            const cat = getCat(item.categoryId);
            const isEditing = editingQuickAdd === item.id;
            
            return (
              <motion.div
                key={item.id}
                initial={slideUp}
                animate={slideUpTo}
                transition={{ ...motionConfig, delay: i * 0.02 }}
                className="card-info min-w-[88px] relative flex-shrink-0"
              >
                <AnimatePresence mode="wait">
                  {isEditing ? (
                    <motion.div
                      key="edit"
                      initial={fadeIn}
                      animate={fadeInTo}
                      exit={fadeIn}
                      transition={motionConfig}
                      className="flex flex-col items-center"
                    >
                      <div className="flex items-center gap-1 mb-2">
                        <button
                          onClick={() => stepAmount(-1)}
                          className="w-6 h-6 rounded-xl bg-secondary flex items-center justify-center active:opacity-70"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="w-14 text-center text-xs bg-secondary rounded-xl p-1"
                          autoFocus
                        />
                        <button
                          onClick={() => stepAmount(1)}
                          className="w-6 h-6 rounded-xl bg-secondary flex items-center justify-center active:opacity-70"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingQuickAdd(null)}
                          className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center active:opacity-70"
                        >
                          <X className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => handleSaveQuickAdd(item.id)}
                          className="w-7 h-7 rounded-full bg-primary flex items-center justify-center active:opacity-80"
                        >
                          <Check className="w-3.5 h-3.5 text-primary-foreground" />
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="view"
                      initial={fadeIn}
                      animate={fadeInTo}
                      exit={fadeIn}
                      transition={motionConfig}
                      className="w-full flex flex-col items-center relative"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingQuickAdd(item.id);
                          setEditAmount(item.amount.toString());
                        }}
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-secondary flex items-center justify-center z-10 active:opacity-70"
                      >
                        <Pencil className="w-2.5 h-2.5 text-muted-foreground" />
                      </button>
                      
                      <button
                        onClick={() => handleQuickAdd(item.categoryId, item.amount)}
                        className="w-full flex flex-col items-center active:opacity-70"
                      >
                        <div 
                          className="category-icon mb-2"
                          style={{ backgroundColor: `${cat.color}15` }}
                        >
                          <CategoryIcon categoryId={cat.id} className="w-5 h-5" style={{ color: cat.color }} />
                        </div>
                        <p className="text-xs font-medium text-foreground">{catLabel(cat)}</p>
                        <p className="text-caption">{formatUZS(item.amount)}</p>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
          <button
            onClick={onAddExpense}
            className="card-info min-w-[88px] flex flex-col items-center justify-center border-2 border-dashed border-border active:opacity-70 flex-shrink-0"
            style={{ boxShadow: 'none' }}
          >
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-2">
              <Plus className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">{t.add}</p>
          </button>
        </div>
      </section>
      
      {/* === Secondary Content (on scroll) === */}
      
      {/* Budgets Section - Hidden initially, show if active */}
      {limits.length > 0 && (
        <section className="mb-card">
          <div className="section-header">
            <h2 className="section-title">{t.monthlyBudgets}</h2>
            <button onClick={() => setActiveScreen("limits")} className="section-action">
              {t.viewAll}
            </button>
          </div>
          <div className="space-y-[14px]">
            {limits.slice(0, 3).map((lim, index) => {
              const cat = getCat(lim.categoryId);
              const spent = monthSpentByCategory(lim.categoryId);
              const pct = lim.amount ? Math.round((spent / lim.amount) * 100) : 0;
              const isOver = pct >= 100;
              
              return (
                <motion.div 
                  key={lim.id}
                  initial={slideUp}
                  animate={slideUpTo}
                  transition={{ ...motionConfig, delay: index * 0.02 }}
                  className="card-info"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div 
                        className="category-icon"
                        style={{ backgroundColor: `${cat.color}15` }}
                      >
                        <CategoryIcon categoryId={cat.id} className="w-5 h-5" style={{ color: cat.color }} />
                      </div>
                      <span className="text-body-medium text-foreground">{catLabel(cat)}</span>
                    </div>
                    <span className={`text-body-medium ${isOver ? 'text-destructive' : 'text-foreground'}`}>
                      {pct}%
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className={`progress-fill ${isOver ? 'progress-fill-danger' : ''}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-caption">{formatUZS(spent)}</span>
                    <span className="text-caption">{formatUZS(lim.amount)}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}
      
      {/* Recent Transactions - Minimal preview */}
      {transactions.length > 0 && (
        <section className="mb-6">
          <div className="section-header">
            <h2 className="section-title">{t.allTransactions}</h2>
            <button onClick={() => setActiveScreen("transactions")} className="section-action">
              {t.viewAll}
            </button>
          </div>
          
          <div className="space-y-[14px]">
            {transactions.slice(0, 3).map((tx, index) => {
              const cat = getCat(tx.categoryId);
              return (
                <motion.div 
                  key={tx.id}
                  initial={slideUp}
                  animate={slideUpTo}
                  transition={{ ...motionConfig, delay: index * 0.02 }}
                  className="list-item"
                >
                  <div 
                    className="category-icon"
                    style={{ backgroundColor: `${cat.color}15` }}
                  >
                    <CategoryIcon categoryId={cat.id} className="w-5 h-5" style={{ color: cat.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-medium text-foreground truncate">{tx.description}</p>
                    <p className="text-caption">{tx.date}</p>
                  </div>
                  <p className={`text-body-medium ${tx.amount > 0 ? 'amount-income' : 'amount-expense'}`}>
                    {tx.amount > 0 ? '+' : ''}{formatUZS(tx.amount)}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

    </div>

    {/* Modals */}
    <AICopilotPanel isOpen={showAICopilot} onClose={() => setShowAICopilot(false)} />
    <FinancePlannerModal isOpen={showFinancePlanner} onClose={() => setShowFinancePlanner(false)} />
    <BudgetSimulatorModal isOpen={showBudgetSimulator} onClose={() => setShowBudgetSimulator(false)} />
    </>
  );
};
