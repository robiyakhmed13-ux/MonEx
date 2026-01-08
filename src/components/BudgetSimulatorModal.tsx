import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { formatCurrency } from "@/lib/exportData";
import { 
  Calculator, 
  X, 
  TrendingDown, 
  TrendingUp, 
  Sparkles,
  PiggyBank,
  Target,
  ArrowRight,
  Percent,
  DollarSign,
  Calendar,
  CalendarDays
} from "lucide-react";

interface BudgetSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SimulationResult {
  monthlySavings: number;
  yearlySavings: number;
  daysToGoal: number | null;
  percentReduction: number;
  originalAmount: number;
  newAmount: number;
}

interface DailyCalculatorResult {
  monthlyTotal: number;
  yearlyTotal: number;
  daysPerWeek: number;
  dailyAmount: number;
  daysToGoal: number | null;
}

type CalculatorMode = 'reduction' | 'daily';

export const BudgetSimulatorModal: React.FC<BudgetSimulatorModalProps> = ({ isOpen, onClose }) => {
  const { transactions, currency, lang, goals, getCat, catLabel, allCats } = useApp();
  const [mode, setMode] = useState<CalculatorMode>('reduction');
  const [selectedCategory, setSelectedCategory] = useState<string>("taxi");
  const [reductionPercent, setReductionPercent] = useState(50);
  const [dailyAmount, setDailyAmount] = useState<number>(0);
  const [daysPerWeek, setDaysPerWeek] = useState<number>(5);
  
  const labels = {
    title: lang === 'ru' ? 'Симулятор бюджета' : lang === 'uz' ? 'Byudjet simulyatori' : 'Budget Simulator',
    subtitle: lang === 'ru' ? 'Что если я сокращу расходы?' : lang === 'uz' ? 'Xarajatlarni kamaytirsam nima bo\'ladi?' : 'What if I reduce spending?',
    selectCategory: lang === 'ru' ? 'Выберите категорию' : lang === 'uz' ? 'Kategoriyani tanlang' : 'Select category',
    reduction: lang === 'ru' ? 'Сокращение' : lang === 'uz' ? 'Kamaytirish' : 'Reduction',
    currentSpending: lang === 'ru' ? 'Текущие расходы' : lang === 'uz' ? 'Joriy xarajatlar' : 'Current spending',
    afterReduction: lang === 'ru' ? 'После сокращения' : lang === 'uz' ? 'Kamaytirishdan keyin' : 'After reduction',
    monthlySavings: lang === 'ru' ? 'Экономия в месяц' : lang === 'uz' ? 'Oylik tejash' : 'Monthly savings',
    yearlySavings: lang === 'ru' ? 'Экономия в год' : lang === 'uz' ? 'Yillik tejash' : 'Yearly savings',
    daysToGoal: lang === 'ru' ? 'Дней до цели' : lang === 'uz' ? 'Maqsadgacha kunlar' : 'Days to goal',
    noGoals: lang === 'ru' ? 'Добавьте цель для расчёта' : lang === 'uz' ? 'Hisoblash uchun maqsad qo\'shing' : 'Add a goal to calculate',
    perMonth: lang === 'ru' ? 'в месяц' : lang === 'uz' ? 'oyiga' : 'per month',
    perYear: lang === 'ru' ? 'в год' : lang === 'uz' ? 'yiliga' : 'per year',
    tip: lang === 'ru' ? 'Совет: попробуйте разные сценарии!' : lang === 'uz' ? 'Maslahat: turli senariylarni sinab ko\'ring!' : 'Tip: try different scenarios!',
    modeReduction: lang === 'ru' ? 'Сокращение расходов' : lang === 'uz' ? 'Xarajatlarni kamaytirish' : 'Reduce Spending',
    modeDaily: lang === 'ru' ? 'Ежедневные расходы' : lang === 'uz' ? 'Kunlik xarajatlar' : 'Daily Spending',
    dailyAmount: lang === 'ru' ? 'Сумма в день' : lang === 'uz' ? 'Kunlik summa' : 'Daily Amount',
    daysPerWeek: lang === 'ru' ? 'Дней в неделю' : lang === 'uz' ? 'Haftada kunlar' : 'Days Per Week',
    monthlyTotal: lang === 'ru' ? 'Всего в месяц' : lang === 'uz' ? 'Oylik jami' : 'Monthly Total',
    yearlyTotal: lang === 'ru' ? 'Всего в год' : lang === 'uz' ? 'Yillik jami' : 'Yearly Total',
    weekdays: lang === 'ru' ? 'Будни (5 дней)' : lang === 'uz' ? 'Ish kunlari (5 kun)' : 'Weekdays (5 days)',
    allWeek: lang === 'ru' ? 'Вся неделя (7 дней)' : lang === 'uz' ? 'Butun hafta (7 kun)' : 'Full Week (7 days)',
  };

  // Calculate spending by category for this month
  const categorySpending = useMemo(() => {
    const monthStart = new Date().toISOString().slice(0, 7) + '-01';
    const spending: Record<string, number> = {};
    
    transactions.forEach(tx => {
      if (tx.amount < 0 && tx.date >= monthStart) {
        const amount = Math.abs(tx.amount);
        spending[tx.categoryId] = (spending[tx.categoryId] || 0) + amount;
      }
    });
    
    return spending;
  }, [transactions]);

  // Get top spending categories
  const topCategories = useMemo(() => {
    return Object.entries(categorySpending)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id]) => id);
  }, [categorySpending]);

  // Calculate simulation results (reduction mode)
  const simulation: SimulationResult | null = useMemo(() => {
    if (mode !== 'reduction') return null;
    
    const originalAmount = categorySpending[selectedCategory] || 0;
    if (originalAmount === 0) return null;

    const newAmount = originalAmount * (1 - reductionPercent / 100);
    const monthlySavings = originalAmount - newAmount;
    const yearlySavings = monthlySavings * 12;

    // Calculate days to reach first goal
    let daysToGoal: number | null = null;
    if (goals.length > 0 && monthlySavings > 0) {
      const firstGoal = goals[0];
      const remaining = firstGoal.target - firstGoal.current;
      if (remaining > 0) {
        const dailySavings = monthlySavings / 30;
        daysToGoal = Math.ceil(remaining / dailySavings);
      }
    }

    return {
      monthlySavings,
      yearlySavings,
      daysToGoal,
      percentReduction: reductionPercent,
      originalAmount,
      newAmount
    };
  }, [mode, selectedCategory, reductionPercent, categorySpending, goals]);

  // Calculate daily spending results
  const dailyResult: DailyCalculatorResult | null = useMemo(() => {
    if (mode !== 'daily' || dailyAmount <= 0) return null;

    const monthlyTotal = dailyAmount * daysPerWeek * 4; // 4 weeks per month
    const yearlyTotal = monthlyTotal * 12;

    // Calculate days to reach first goal
    let daysToGoal: number | null = null;
    if (goals.length > 0 && monthlyTotal > 0) {
      const firstGoal = goals[0];
      const remaining = firstGoal.target - firstGoal.current;
      if (remaining > 0) {
        const dailySavings = monthlyTotal / 30;
        daysToGoal = Math.ceil(remaining / dailySavings);
      }
    }

    return {
      monthlyTotal,
      yearlyTotal,
      daysPerWeek,
      dailyAmount,
      daysToGoal
    };
  }, [mode, dailyAmount, daysPerWeek, goals]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-background rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 border-b border-border bg-gradient-to-br from-amber-500/10 to-orange-500/10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <Calculator className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                    {labels.title}
                    <Sparkles className="w-4 h-4 text-amber-500" />
                  </h2>
                  <p className="text-sm text-muted-foreground">{labels.subtitle}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Mode Selector */}
            <div className="flex gap-2 p-1 rounded-xl bg-secondary/50">
              <button
                onClick={() => setMode('reduction')}
                className={`flex-1 px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all ${
                  mode === 'reduction'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Percent className="w-4 h-4" />
                <span className="text-sm font-medium">{labels.modeReduction}</span>
              </button>
              <button
                onClick={() => setMode('daily')}
                className={`flex-1 px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all ${
                  mode === 'daily'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                <span className="text-sm font-medium">{labels.modeDaily}</span>
              </button>
            </div>

            {/* Category Selection */}
            {mode === 'reduction' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">{labels.selectCategory}</label>
              <div className="flex flex-wrap gap-2">
                {topCategories.length > 0 ? topCategories.map(catId => {
                  const cat = getCat(catId);
                  const amount = categorySpending[catId] || 0;
                  return (
                    <button
                      key={catId}
                      onClick={() => setSelectedCategory(catId)}
                      className={`px-3 py-2 rounded-xl flex items-center gap-2 transition-all ${
                        selectedCategory === catId
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary hover:bg-muted'
                      }`}
                    >
                      <span>{cat.emoji}</span>
                      <span className="text-sm font-medium">{catLabel(cat)}</span>
                    </button>
                  );
                }) : (
                  allCats.expense.slice(0, 6).map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-2 rounded-xl flex items-center gap-2 transition-all ${
                        selectedCategory === cat.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary hover:bg-muted'
                      }`}
                    >
                      <span>{cat.emoji}</span>
                      <span className="text-sm font-medium">{catLabel(cat)}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
            )}

            {/* Daily Calculator Inputs */}
            {mode === 'daily' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-secondary/50">
                  <label className="block text-sm font-medium text-foreground mb-3">
                    {labels.dailyAmount}
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={dailyAmount || ''}
                      onChange={(e) => setDailyAmount(Number(e.target.value) || 0)}
                      placeholder={lang === 'ru' ? 'Введите сумму' : lang === 'uz' ? 'Summani kiriting' : 'Enter amount'}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-secondary/50">
                  <label className="block text-sm font-medium text-foreground mb-3">
                    {labels.daysPerWeek}
                  </label>
                  <div className="space-y-2">
                    <button
                      onClick={() => setDaysPerWeek(5)}
                      className={`w-full px-4 py-3 rounded-xl flex items-center justify-between transition-all ${
                        daysPerWeek === 5
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background border border-border hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm font-medium">{labels.weekdays}</span>
                      </div>
                      <span className="text-sm font-bold">5</span>
                    </button>
                    <button
                      onClick={() => setDaysPerWeek(7)}
                      className={`w-full px-4 py-3 rounded-xl flex items-center justify-between transition-all ${
                        daysPerWeek === 7
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background border border-border hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4" />
                        <span className="text-sm font-medium">{labels.allWeek}</span>
                      </div>
                      <span className="text-sm font-bold">7</span>
                    </button>
                    <div className="flex gap-2 mt-2">
                      {[1, 2, 3, 4, 6].map(days => (
                        <button
                          key={days}
                          onClick={() => setDaysPerWeek(days)}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            daysPerWeek === days
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-background border border-border hover:bg-muted'
                          }`}
                        >
                          {days}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Reduction Slider */}
            {mode === 'reduction' && (
            <div className="p-4 rounded-2xl bg-secondary/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-foreground">{labels.reduction}</span>
                <span className="text-2xl font-bold text-primary flex items-center gap-1">
                  <Percent className="w-5 h-5" />
                  {reductionPercent}%
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="10"
                value={reductionPercent}
                onChange={(e) => setReductionPercent(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>10%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
            )}

            {/* Results - Reduction Mode */}
            {mode === 'reduction' && simulation ? (
              <div className="space-y-3">
                {/* Before/After Comparison */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-expense/10 border border-expense/20">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="w-4 h-4 text-expense" />
                      <span className="text-xs text-muted-foreground">{labels.currentSpending}</span>
                    </div>
                    <p className="text-lg font-bold text-foreground">
                      {formatCurrency(simulation.originalAmount, currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">{labels.perMonth}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-income/10 border border-income/20">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-income" />
                      <span className="text-xs text-muted-foreground">{labels.afterReduction}</span>
                    </div>
                    <p className="text-lg font-bold text-foreground">
                      {formatCurrency(simulation.newAmount, currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">{labels.perMonth}</p>
                  </div>
                </div>

                {/* Savings Impact */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                      <PiggyBank className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{labels.monthlySavings}</p>
                      <p className="text-2xl font-bold text-primary">
                        +{formatCurrency(simulation.monthlySavings, currency)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between py-2 border-t border-primary/10">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{labels.yearlySavings}</span>
                    </div>
                    <span className="font-bold text-income">
                      +{formatCurrency(simulation.yearlySavings, currency)}
                    </span>
                  </div>
                  
                  {simulation.daysToGoal !== null && goals.length > 0 && (
                    <div className="flex items-center justify-between py-2 border-t border-primary/10">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {goals[0].name} <ArrowRight className="w-3 h-3 inline" />
                        </span>
                      </div>
                      <span className="font-bold text-foreground">
                        {simulation.daysToGoal} {lang === 'ru' ? 'дней' : lang === 'uz' ? 'kun' : 'days'}
                      </span>
                    </div>
                  )}
                </motion.div>

                {/* Tip */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    {labels.tip}
                  </p>
                </div>
              </div>
            ) : mode === 'reduction' ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-3">
                  <Calculator className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  {lang === 'ru' ? 'Нет расходов в этой категории' : 
                   lang === 'uz' ? 'Bu kategoriyada xarajatlar yo\'q' : 
                   'No spending in this category'}
                </p>
              </div>
            ) : null}

            {/* Results - Daily Calculator Mode */}
            {mode === 'daily' && dailyResult ? (
              <div className="space-y-3">
                {/* Monthly/Yearly Totals */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                      <CalendarDays className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{labels.monthlyTotal}</p>
                      <p className="text-2xl font-bold text-primary">
                        {formatCurrency(dailyResult.monthlyTotal, currency)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between py-2 border-t border-primary/10">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{labels.yearlyTotal}</span>
                    </div>
                    <span className="font-bold text-foreground">
                      {formatCurrency(dailyResult.yearlyTotal, currency)}
                    </span>
                  </div>
                  
                  {dailyResult.daysToGoal !== null && goals.length > 0 && (
                    <div className="flex items-center justify-between py-2 border-t border-primary/10">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {goals[0].name} <ArrowRight className="w-3 h-3 inline" />
                        </span>
                      </div>
                      <span className="font-bold text-foreground">
                        {dailyResult.daysToGoal} {lang === 'ru' ? 'дней' : lang === 'uz' ? 'kun' : 'days'}
                      </span>
                    </div>
                  )}
                </motion.div>

                {/* Calculation Details */}
                <div className="p-4 rounded-2xl bg-secondary/50">
                  <p className="text-xs text-muted-foreground text-center">
                    {formatCurrency(dailyResult.dailyAmount, currency)} × {dailyResult.daysPerWeek} {lang === 'ru' ? 'дней' : lang === 'uz' ? 'kun' : 'days'} × 4 {lang === 'ru' ? 'недели' : lang === 'uz' ? 'hafta' : 'weeks'} = {formatCurrency(dailyResult.monthlyTotal, currency)}
                  </p>
                </div>

                {/* Tip */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    {labels.tip}
                  </p>
                </div>
              </div>
            ) : mode === 'daily' ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-3">
                  <Calculator className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  {lang === 'ru' ? 'Введите ежедневную сумму для расчета' : 
                   lang === 'uz' ? 'Hisoblash uchun kunlik summani kiriting' : 
                   'Enter daily amount to calculate'}
                </p>
              </div>
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BudgetSimulatorModal;
