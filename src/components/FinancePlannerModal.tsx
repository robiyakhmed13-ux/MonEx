import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import { 
  X,
  Sparkles, 
  Target, 
  TrendingUp, 
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Send,
  ChevronRight,
  DollarSign,
  Clock,
  Award
} from "lucide-react";

interface FinancialPlan {
  goalName: string;
  targetAmount: number;
  monthlyRequired: number;
  timeframeMonths: number;
  deadline: string;
  feasibility: 'easy' | 'moderate' | 'challenging' | 'difficult';
  feasibilityScore: number;
  savingsRate: number;
  recommendations: string[];
  milestones: Array<{ month: number; amount: number; description: string }>;
  warnings: string[];
}

interface FinancePlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FEASIBILITY_COLORS: Record<string, string> = {
  easy: 'text-income bg-income/20',
  moderate: 'text-amber-600 bg-amber-500/20',
  challenging: 'text-orange-600 bg-orange-500/20',
  difficult: 'text-destructive bg-destructive/20',
};

const EXAMPLES = {
  ru: [
    'Накопить на машину за 2 года',
    'Сберечь 10 миллионов за год',
    'Накопить на отпуск 5 млн за 6 месяцев',
    'Создать подушку безопасности на 3 месяца',
  ],
  uz: [
    '2 yilda mashina uchun to\'plash',
    '1 yilda 10 million yig\'ish',
    '6 oyda dam olish uchun 5 mln to\'plash',
    '3 oylik xavfsizlik yostig\'i yaratish',
  ],
  en: [
    'Save for a car in 2 years',
    'Save 10 million in 1 year',
    'Save 5m for vacation in 6 months',
    'Build 3-month emergency fund',
  ],
};

export const FinancePlannerModal: React.FC<FinancePlannerModalProps> = ({ isOpen, onClose }) => {
  const { lang, currency, balance, transactions, addGoal } = useApp();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<FinancialPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const labels = {
    title: lang === 'ru' ? 'Финансовый Планировщик' : lang === 'uz' ? 'Moliyaviy Rejalashtiruvchi' : 'Finance Planner',
    subtitle: lang === 'ru' ? 'Опишите цель естественным языком' : lang === 'uz' ? 'Maqsadingizni tabiiy tilda tasvirlang' : 'Describe your goal in natural language',
    placeholder: lang === 'ru' ? 'Хочу накопить на машину за год...' : lang === 'uz' ? 'Bir yilda mashina uchun to\'plamoqchiman...' : 'I want to save for a car in a year...',
    generate: lang === 'ru' ? 'Создать план' : lang === 'uz' ? 'Reja yaratish' : 'Generate Plan',
    generating: lang === 'ru' ? 'Создаю план...' : lang === 'uz' ? 'Reja yaratilmoqda...' : 'Generating...',
    examples: lang === 'ru' ? 'Примеры:' : lang === 'uz' ? 'Misollar:' : 'Examples:',
    saveGoal: lang === 'ru' ? 'Добавить цель' : lang === 'uz' ? 'Maqsad qo\'shish' : 'Add Goal',
    newPlan: lang === 'ru' ? 'Новый план' : lang === 'uz' ? 'Yangi reja' : 'New Plan',
    perMonth: lang === 'ru' ? '/мес' : lang === 'uz' ? '/oy' : '/mo',
    months: lang === 'ru' ? 'мес' : lang === 'uz' ? 'oy' : 'months',
    ofIncome: lang === 'ru' ? 'от дохода' : lang === 'uz' ? 'daromaddan' : 'of income',
    recommendations: lang === 'ru' ? 'Рекомендации' : lang === 'uz' ? 'Tavsiyalar' : 'Recommendations',
    milestones: lang === 'ru' ? 'Этапы' : lang === 'uz' ? 'Bosqichlar' : 'Milestones',
  };

  // Calculate monthly income from transactions
  const monthlyIncome = React.useMemo(() => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    return transactions
      .filter(t => t.date.startsWith(thisMonth) && t.amount > 0)
      .reduce((s, t) => s + t.amount, 0) || 5000000; // Default 5M if no data
  }, [transactions]);

  const monthlyExpenses = React.useMemo(() => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    return transactions
      .filter(t => t.date.startsWith(thisMonth) && t.amount < 0)
      .reduce((s, t) => s + Math.abs(t.amount), 0) || 3000000;
  }, [transactions]);

  const generatePlan = useCallback(async (goalPrompt: string) => {
    if (!goalPrompt.trim()) return;

    setLoading(true);
    setError(null);
    setPlan(null);

    try {
      const data = await api.financePlanner({
        prompt: goalPrompt,
        balance,
        monthlyIncome,
        monthlyExpenses,
        currency,
        lang,
      });

      if (data?.error) {
        setError(data.error);
      } else if (data) {
        // Map response to expected structure
        setPlan({
          goalName: data.name || goalPrompt,
          targetAmount: data.targetAmount || 0,
          monthlyRequired: data.monthlyRequired || 0,
          timeframeMonths: Math.ceil((new Date(data.deadline).getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000)) || 12,
          deadline: data.deadline || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          feasibility: data.feasibility || 'moderate',
          feasibilityScore: data.feasibility === 'easy' ? 80 : data.feasibility === 'moderate' ? 60 : data.feasibility === 'challenging' ? 40 : 20,
          savingsRate: Math.round((data.monthlyRequired / monthlyIncome) * 100) || 0,
          recommendations: data.tips || [],
          milestones: [],
          warnings: data.feasibility === 'difficult' ? [data.message || 'This goal may be challenging'] : [],
        });
      }
    } catch (err) {
      console.error('Finance Planner error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [balance, monthlyIncome, monthlyExpenses, currency, lang]);

  const handleSaveGoal = () => {
    if (!plan) return;
    
    addGoal({
      name: plan.goalName,
      target: plan.targetAmount,
      current: 0,
      emoji: '🎯',
      deadline: plan.deadline,
    });
    
    onClose();
  };

  const formatAmount = (amount: number) => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-background rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-border bg-gradient-to-br from-emerald-500/10 to-teal-500/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
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
        <div className="flex-1 overflow-y-auto p-4">
          {!plan ? (
            <>
              {/* Input */}
              <div className="mb-4">
                <div className="relative">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={labels.placeholder}
                    className="w-full p-4 pr-12 rounded-2xl border-2 border-border bg-secondary/30 resize-none text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                    rows={3}
                  />
                  <button
                    onClick={() => generatePlan(prompt)}
                    disabled={loading || !prompt.trim()}
                    className="absolute bottom-3 right-3 w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Examples */}
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-2">{labels.examples}</p>
                <div className="space-y-2">
                  {(EXAMPLES[lang as keyof typeof EXAMPLES] || EXAMPLES.en).map((example, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setPrompt(example);
                        generatePlan(example);
                      }}
                      className="w-full p-3 rounded-xl bg-secondary/50 hover:bg-secondary text-left text-sm text-foreground transition-colors flex items-center gap-2"
                    >
                      <span className="text-muted-foreground">💡</span>
                      {example}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Goal Summary Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-accent border border-primary/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Target className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground">{plan.goalName}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FEASIBILITY_COLORS[plan.feasibility]}`}>
                      {plan.feasibility === 'easy' ? '✓' : plan.feasibility === 'moderate' ? '≈' : '!'} {plan.feasibility}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-background/50">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Target</span>
                    </div>
                    <p className="font-bold text-foreground">{formatAmount(plan.targetAmount)} <span className="text-xs font-normal">{currency}</span></p>
                  </div>
                  <div className="p-3 rounded-xl bg-background/50">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Timeframe</span>
                    </div>
                    <p className="font-bold text-foreground">{plan.timeframeMonths} <span className="text-xs font-normal">{labels.months}</span></p>
                  </div>
                  <div className="p-3 rounded-xl bg-background/50">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Monthly</span>
                    </div>
                    <p className="font-bold text-foreground">{formatAmount(plan.monthlyRequired)} <span className="text-xs font-normal">{labels.perMonth}</span></p>
                  </div>
                  <div className="p-3 rounded-xl bg-background/50">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Deadline</span>
                    </div>
                    <p className="font-bold text-foreground">{plan.deadline}</p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-primary/20">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{plan.savingsRate}% {labels.ofIncome}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">Score:</span>
                      <span className={`font-bold ${plan.feasibilityScore > 60 ? 'text-income' : plan.feasibilityScore > 30 ? 'text-amber-500' : 'text-destructive'}`}>
                        {plan.feasibilityScore}/100
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Warnings */}
              {plan.warnings?.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-700 dark:text-amber-300">
                      {plan.warnings.map((w, i) => (
                        <p key={i}>{w}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              <div>
                <h4 className="font-semibold text-foreground mb-2">{labels.recommendations}</h4>
                <div className="space-y-2">
                  {plan.recommendations?.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-secondary/50">
                      <CheckCircle2 className="w-4 h-4 text-income mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-foreground">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Milestones */}
              {plan.milestones?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-foreground mb-2">{labels.milestones}</h4>
                  <div className="space-y-2">
                    {plan.milestones.map((m, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/30">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <Award className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{m.description}</p>
                          <p className="text-xs text-muted-foreground">
                            Month {m.month}: {formatAmount(m.amount)} {currency}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Footer */}
        {plan && (
          <div className="p-4 border-t border-border flex gap-3">
            <button
              onClick={() => setPlan(null)}
              className="flex-1 py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium transition-colors"
            >
              {labels.newPlan}
            </button>
            <button
              onClick={handleSaveGoal}
              className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
            >
              <Target className="w-4 h-4" />
              {labels.saveGoal}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default FinancePlannerModal;
