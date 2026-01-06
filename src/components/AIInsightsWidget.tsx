import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import { 
  ChevronRight, RefreshCw, AlertTriangle, TrendingUp, 
  Lightbulb, Trophy, Target, Zap, CheckCircle
} from "lucide-react";

/**
 * AI Insights Widget - Design System Rules:
 * - Insight Card pattern: 1 sentence max + premium icon
 * - AI speaks rarely but wisely
 * - Max 1-2 sentences, no paragraphs
 * - Always actionable or silent
 * - Auto-refresh every 6 hours
 * - ICONS instead of emojis (premium feel)
 */

interface Insight {
  type: 'warning' | 'pattern' | 'prediction' | 'suggestion' | 'achievement';
  severity: 'low' | 'medium' | 'high' | 'critical';
  icon: string;
  title: string;
  message: string;
}

const CACHE_KEY = 'monex_ai_insights';
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

interface AIInsightsWidgetProps {
  onOpenFullPanel: () => void;
}

// Map insight types to premium Lucide icons
const getInsightIcon = (type: Insight['type'], severity: Insight['severity']) => {
  switch (type) {
    case 'warning':
      return <AlertTriangle className="w-5 h-5 text-destructive" />;
    case 'pattern':
      return <TrendingUp className="w-5 h-5 text-primary" />;
    case 'prediction':
      return <Target className="w-5 h-5 text-primary" />;
    case 'suggestion':
      return <Lightbulb className="w-5 h-5 text-amber-500" />;
    case 'achievement':
      return <Trophy className="w-5 h-5 text-income" />;
    default:
      return <Zap className="w-5 h-5 text-primary" />;
  }
};

export const AIInsightsWidget: React.FC<AIInsightsWidgetProps> = ({ onOpenFullPanel }) => {
  const { transactions, balance, currency, limits, goals, lang } = useApp();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);

  // Labels in correct language based on lang setting
  const labels = {
    title: lang === 'ru' ? 'Инсайты' : lang === 'uz' ? 'Tushunchalar' : 'Insights',
    viewAll: lang === 'ru' ? 'Ещё' : lang === 'uz' ? 'Ko\'proq' : 'More',
    noInsights: lang === 'ru' ? 'Всё в порядке' : lang === 'uz' ? 'Hammasi yaxshi' : 'All good',
    analyzing: lang === 'ru' ? 'Анализ...' : lang === 'uz' ? 'Tahlil...' : 'Analyzing...',
  };

  const fetchInsights = useCallback(async (force = false) => {
    // Check cache first
    if (!force) {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < CACHE_TTL) {
            setInsights(parsed.insights);
            return;
          }
        }
      } catch (e) {}
    }

    if (transactions.length === 0) {
      setInsights([]);
      return;
    }

    setLoading(true);

    try {
      const data = await api.aiCopilot({
        transactions: transactions.slice(0, 50),
        balance,
        currency,
        limits: limits.map(l => ({ categoryId: l.categoryId, amount: l.amount })),
        goals: goals.map(g => ({ name: g.name, target: g.target, current: g.current })),
        lang, // Pass language to API
      });

      if (data?.insights && !data?.error) {
        const newInsights = data.insights.slice(0, 3);
        setInsights(newInsights);
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          insights: newInsights,
          timestamp: Date.now(),
        }));
      }
    } catch (err) {
      console.error('AI Insights error:', err);
    } finally {
      setLoading(false);
    }
  }, [transactions, balance, currency, limits, goals, lang]);

  useEffect(() => {
    fetchInsights();
    // Auto-refresh every 6 hours
    const interval = setInterval(() => fetchInsights(true), CACHE_TTL);
    return () => clearInterval(interval);
  }, [fetchInsights]);

  // Loading state - minimal with icon
  if (loading && insights.length === 0) {
    return (
      <div className="card-insight mb-6 animate-pulse">
        <Zap className="w-5 h-5 text-primary" />
        <span className="text-body text-muted-foreground">{labels.analyzing}</span>
      </div>
    );
  }

  // No insights - show simple "all good" message with icon
  if (insights.length === 0) {
    return (
      <div className="card-insight mb-6">
        <CheckCircle className="w-5 h-5 text-income" />
        <span className="text-body text-foreground">{labels.noInsights}</span>
      </div>
    );
  }

  return (
    <section className="mb-6">
      {/* Section Header */}
      <div className="section-header">
        <div className="flex items-center gap-2">
          <h2 className="section-title">{labels.title}</h2>
          <button
            onClick={() => fetchInsights(true)}
            disabled={loading}
            className="p-1 rounded active:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <button onClick={onOpenFullPanel} className="section-action flex items-center gap-1">
          {labels.viewAll}
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Insight Cards - Premium icons, ONE idea per card */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {insights.map((insight, index) => (
            <motion.button
              key={`${insight.type}-${index}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: index * 0.05, duration: 0.2 }}
              onClick={onOpenFullPanel}
              className="card-insight w-full text-left active:opacity-80"
            >
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                {getInsightIcon(insight.type, insight.severity)}
              </div>
              <p className="card-insight-text flex-1 line-clamp-1">{insight.message || insight.title}</p>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default AIInsightsWidget;