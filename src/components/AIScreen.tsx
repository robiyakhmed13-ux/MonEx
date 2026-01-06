import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import { formatUZS } from "@/lib/storage";
import {
  Brain,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  Target,
  Trophy,
  ChevronRight,
  Zap,
  PiggyBank,
  Calculator,
  LineChart,
  Shield,
  Clock,
  TrendingDown,
} from "lucide-react";

interface Insight {
  type: 'warning' | 'pattern' | 'prediction' | 'suggestion' | 'achievement';
  severity: 'low' | 'medium' | 'high' | 'critical';
  icon: string;
  title: string;
  message: string;
  action?: string;
  actionLabel?: string;
}

const INSIGHT_ICONS: Record<string, React.ReactNode> = {
  warning: <AlertTriangle className="w-5 h-5" />,
  pattern: <TrendingUp className="w-5 h-5" />,
  prediction: <Target className="w-5 h-5" />,
  suggestion: <Lightbulb className="w-5 h-5" />,
  achievement: <Trophy className="w-5 h-5" />,
};

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-muted',
  medium: 'bg-amber-500/10',
  high: 'bg-orange-500/10',
  critical: 'bg-destructive/10',
};

const SEVERITY_ICON_COLORS: Record<string, string> = {
  low: 'text-muted-foreground',
  medium: 'text-amber-500',
  high: 'text-orange-500',
  critical: 'text-destructive',
};

export const AIScreen: React.FC = () => {
  const { transactions, balance, currency, limits, goals, lang, t, setActiveScreen } = useApp();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAnalyzed, setLastAnalyzed] = useState<Date | null>(null);

  const labels = {
    title: lang === 'ru' ? 'AI Помощник' : lang === 'uz' ? 'AI Yordamchi' : 'AI Assistant',
    subtitle: lang === 'ru' ? 'Ваш финансовый советник' : lang === 'uz' ? 'Moliyaviy maslahatchi' : 'Your Financial Advisor',
    analyzing: lang === 'ru' ? 'Анализирую...' : lang === 'uz' ? 'Tahlil qilmoqdaman...' : 'Analyzing...',
    refresh: lang === 'ru' ? 'Обновить' : lang === 'uz' ? 'Yangilash' : 'Refresh',
    noInsights: lang === 'ru' ? 'Всё отлично!' : lang === 'uz' ? 'Hammasi yaxshi!' : 'All good!',
    lastUpdated: lang === 'ru' ? 'Обновлено' : lang === 'uz' ? 'Yangilangan' : 'Updated',
    errorMsg: lang === 'ru' ? 'Ошибка' : lang === 'uz' ? 'Xatolik' : 'Error',
    features: lang === 'ru' ? 'AI Функции' : lang === 'uz' ? 'AI Funksiyalar' : 'AI Features',
    insights: lang === 'ru' ? 'Инсайты' : lang === 'uz' ? 'Tavsiyalar' : 'Insights',
    budgetSimulator: lang === 'ru' ? 'Симулятор бюджета' : lang === 'uz' ? 'Byudjet simulyatori' : 'Budget Simulator',
    financePlanner: lang === 'ru' ? 'Планировщик' : lang === 'uz' ? 'Rejalashtiruvchi' : 'Finance Planner',
    debtAssessment: lang === 'ru' ? 'Оценка долга' : lang === 'uz' ? 'Qarz bahosi' : 'Debt Assessment',
    cashFlow: lang === 'ru' ? 'Денежный поток' : lang === 'uz' ? 'Pul oqimi' : 'Cash Flow',
    netWorth: lang === 'ru' ? 'Чистый капитал' : lang === 'uz' ? 'Sof boylik' : 'Net Worth',
    investments: lang === 'ru' ? 'Инвестиции' : lang === 'uz' ? 'Investitsiyalar' : 'Investments',
  };

  const analyzeFinances = useCallback(async () => {
    if (transactions.length === 0) {
      setInsights([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await api.aiCopilot({
        transactions: transactions.slice(0, 100),
        balance,
        currency,
        limits: limits.map(l => ({ categoryId: l.categoryId, amount: l.amount })),
        goals: goals.map(g => ({ name: g.name, target: g.target, current: g.current })),
        lang,
      });

      if (data?.error) {
        setError(data.error);
      } else if (data?.insights) {
        setInsights(data.insights);
        setLastAnalyzed(new Date());
      }
    } catch (err) {
      console.error('AI analysis error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [transactions, balance, currency, limits, goals, lang]);

  useEffect(() => {
    if (!lastAnalyzed) {
      analyzeFinances();
    }
  }, [lastAnalyzed, analyzeFinances]);

  // AI Features list
  const aiFeatures = [
    { 
      id: 'debt-assessment', 
      icon: Shield, 
      label: labels.debtAssessment,
      color: 'bg-blue-500/10',
      iconColor: 'text-blue-500'
    },
    { 
      id: 'cash-flow', 
      icon: TrendingUp, 
      label: labels.cashFlow,
      color: 'bg-emerald-500/10',
      iconColor: 'text-emerald-500'
    },
    { 
      id: 'net-worth', 
      icon: PiggyBank, 
      label: labels.netWorth,
      color: 'bg-violet-500/10',
      iconColor: 'text-violet-500'
    },
    { 
      id: 'investments', 
      icon: LineChart, 
      label: labels.investments,
      color: 'bg-amber-500/10',
      iconColor: 'text-amber-500'
    },
  ];

  return (
    <div className="screen-container">
      {/* Header */}
      <header className="screen-header">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg">
            <Brain className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-large-title text-foreground flex items-center gap-2">
              {labels.title}
              <Sparkles className="w-5 h-5 text-amber-500" />
            </h1>
            <p className="text-caption">{labels.subtitle}</p>
          </div>
        </div>
      </header>

      {/* AI Features Grid */}
      <section className="mb-6">
        <div className="section-header">
          <h2 className="section-title">{labels.features}</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {aiFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.button
                key={feature.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setActiveScreen(feature.id as any)}
                className="card-elevated flex items-center gap-3 active:opacity-80"
              >
                <div className={`w-10 h-10 rounded-xl ${feature.color} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${feature.iconColor}`} />
                </div>
                <span className="text-body-medium text-foreground">{feature.label}</span>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Insights Section */}
      <section className="mb-6">
        <div className="section-header">
          <h2 className="section-title">{labels.insights}</h2>
          <button 
            onClick={analyzeFinances}
            disabled={loading}
            className="section-action flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {labels.refresh}
          </button>
        </div>

        {loading ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="card-info py-12 flex flex-col items-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center mb-4"
            >
              <Brain className="w-7 h-7 text-primary-foreground" />
            </motion.div>
            <p className="text-caption">{labels.analyzing}</p>
          </motion.div>
        ) : error ? (
          <div className="card-info py-8 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <p className="text-body-medium text-destructive">{labels.errorMsg}</p>
            <p className="text-caption mt-1">{error}</p>
          </div>
        ) : insights.length === 0 ? (
          <div className="card-info py-8 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-[hsl(var(--income))]/10 flex items-center justify-center mb-3">
              <Trophy className="w-6 h-6 text-[hsl(var(--income))]" />
            </div>
            <p className="text-body-medium text-foreground">{labels.noInsights}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {insights.map((insight, index) => (
                <motion.div
                  key={`${insight.type}-${index}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`card-info ${SEVERITY_COLORS[insight.severity]}`}
                >
                  <div className="flex gap-3">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                      insight.severity === 'critical' ? 'bg-destructive/20' :
                      insight.severity === 'high' ? 'bg-orange-500/20' :
                      insight.severity === 'medium' ? 'bg-amber-500/20' :
                      'bg-secondary'
                    } ${SEVERITY_ICON_COLORS[insight.severity]}`}>
                      {INSIGHT_ICONS[insight.type] || <Zap className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-body-medium ${
                        insight.severity === 'critical' ? 'text-destructive' :
                        insight.severity === 'high' ? 'text-orange-600 dark:text-orange-400' :
                        'text-foreground'
                      }`}>
                        {insight.title}
                      </h3>
                      <p className="text-caption mt-1">{insight.message}</p>
                      {insight.actionLabel && (
                        <button className="mt-2 text-xs text-primary font-medium flex items-center gap-1">
                          {insight.actionLabel}
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* Quick Stats */}
      {!loading && !error && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <div className="card-insight">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-body-medium text-foreground">
                {lastAnalyzed 
                  ? `${labels.lastUpdated}: ${lastAnalyzed.toLocaleTimeString()}`
                  : labels.analyzing
                }
              </p>
            </div>
          </div>
        </motion.section>
      )}
    </div>
  );
};

export default AIScreen;
