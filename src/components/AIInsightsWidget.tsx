import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  Brain, 
  AlertTriangle, 
  TrendingUp, 
  Target,
  Trophy,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Zap
} from "lucide-react";

interface Insight {
  type: 'warning' | 'pattern' | 'prediction' | 'suggestion' | 'achievement';
  severity: 'low' | 'medium' | 'high' | 'critical';
  icon: string;
  title: string;
  message: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  low: 'border-muted-foreground/20 bg-muted/50',
  medium: 'border-amber-500/30 bg-amber-500/10',
  high: 'border-orange-500/30 bg-orange-500/10',
  critical: 'border-destructive/30 bg-destructive/10',
};

const SEVERITY_TEXT: Record<string, string> = {
  low: 'text-muted-foreground',
  medium: 'text-amber-600 dark:text-amber-400',
  high: 'text-orange-600 dark:text-orange-400',
  critical: 'text-destructive',
};

const CACHE_KEY = 'monex_ai_insights';
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours in ms

interface CachedInsights {
  insights: Insight[];
  timestamp: number;
}

interface AIInsightsWidgetProps {
  onOpenFullPanel: () => void;
}

export const AIInsightsWidget: React.FC<AIInsightsWidgetProps> = ({ onOpenFullPanel }) => {
  const { transactions, balance, currency, limits, goals, lang } = useApp();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const labels = {
    title: lang === 'ru' ? 'AI Инсайты' : lang === 'uz' ? 'AI Tushunchalar' : 'AI Insights',
    viewAll: lang === 'ru' ? 'Подробнее' : lang === 'uz' ? 'Batafsil' : 'View All',
    loading: lang === 'ru' ? 'Анализ...' : lang === 'uz' ? 'Tahlil...' : 'Analyzing...',
    noInsights: lang === 'ru' ? 'Всё в порядке!' : lang === 'uz' ? 'Hammasi yaxshi!' : 'All good!',
    refresh: lang === 'ru' ? 'Обновить' : lang === 'uz' ? 'Yangilash' : 'Refresh',
  };

  const fetchInsights = useCallback(async (force = false) => {
    // Check cache first
    if (!force) {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed: CachedInsights = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < CACHE_TTL) {
            setInsights(parsed.insights);
            setLastFetch(new Date(parsed.timestamp));
            return;
          }
        }
      } catch (e) {
        console.error('Cache read error:', e);
      }
    }

    if (transactions.length === 0) {
      setInsights([]);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-copilot', {
        body: {
          transactions: transactions.slice(0, 50),
          balance,
          currency,
          limits: limits.map(l => ({ categoryId: l.categoryId, amount: l.amount })),
          goals: goals.map(g => ({ name: g.name, target: g.target, current: g.current })),
          lang,
        }
      });

      if (!error && data?.insights) {
        const newInsights = data.insights.slice(0, 3); // Max 3 for widget
        setInsights(newInsights);
        setLastFetch(new Date());
        
        // Cache the results
        const cacheData: CachedInsights = {
          insights: newInsights,
          timestamp: Date.now(),
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      }
    } catch (err) {
      console.error('AI Insights fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [transactions, balance, currency, limits, goals, lang]);

  // Auto-fetch on mount and set up 6-hour interval
  useEffect(() => {
    fetchInsights();
    
    const interval = setInterval(() => {
      fetchInsights(true);
    }, CACHE_TTL);

    return () => clearInterval(interval);
  }, [fetchInsights]);

  if (loading && insights.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20"
      >
        <div className="flex items-center gap-3">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center"
          >
            <Brain className="w-5 h-5 text-white" />
          </motion.div>
          <div>
            <p className="font-medium text-foreground">{labels.title}</p>
            <p className="text-xs text-muted-foreground">{labels.loading}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (insights.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-income/10 to-emerald-500/10 border border-income/20"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-income/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-income" />
            </div>
            <div>
              <p className="font-medium text-foreground flex items-center gap-2">
                {labels.title}
                <Sparkles className="w-4 h-4 text-amber-500" />
              </p>
              <p className="text-xs text-muted-foreground">{labels.noInsights}</p>
            </div>
          </div>
          <button
            onClick={() => fetchInsights(true)}
            className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-violet-500" />
          <h3 className="font-semibold text-foreground">{labels.title}</h3>
          <Sparkles className="w-4 h-4 text-amber-500" />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchInsights(true)}
            className="p-1.5 rounded-lg hover:bg-secondary/50 transition-colors"
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onOpenFullPanel}
            className="text-xs text-primary font-medium flex items-center gap-1"
          >
            {labels.viewAll}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Insight Cards */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {insights.map((insight, index) => (
            <motion.div
              key={`${insight.type}-${index}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.1 }}
              onClick={onOpenFullPanel}
              className={`p-3 rounded-xl border cursor-pointer hover:scale-[1.01] transition-transform ${SEVERITY_COLORS[insight.severity]}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-lg flex-shrink-0">{insight.icon || '💡'}</span>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm ${SEVERITY_TEXT[insight.severity]}`}>
                    {insight.title}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {insight.message}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default AIInsightsWidget;
