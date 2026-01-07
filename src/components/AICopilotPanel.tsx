import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import { Capacitor } from "@capacitor/core";
import { 
  Brain,
  X, 
  AlertTriangle, 
  TrendingUp, 
  Lightbulb, 
  Target,
  Trophy,
  RefreshCw,
  Sparkles,
  ChevronRight,
  Moon,
  Zap
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

interface AICopilotPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const INSIGHT_ICONS: Record<string, React.ReactNode> = {
  warning: <AlertTriangle className="w-5 h-5" />,
  pattern: <TrendingUp className="w-5 h-5" />,
  prediction: <Target className="w-5 h-5" />,
  suggestion: <Lightbulb className="w-5 h-5" />,
  achievement: <Trophy className="w-5 h-5" />,
};

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-muted border-muted-foreground/20',
  medium: 'bg-amber-500/10 border-amber-500/30',
  high: 'bg-orange-500/10 border-orange-500/30',
  critical: 'bg-destructive/10 border-destructive/30',
};

const SEVERITY_ICON_COLORS: Record<string, string> = {
  low: 'text-muted-foreground',
  medium: 'text-amber-500',
  high: 'text-orange-500',
  critical: 'text-destructive',
};

// Map action types to screen names
const getActionRoute = (action?: string): string | null => {
  if (!action) return null;
  
  switch (action) {
    case 'move_money':
      return 'goals'; // Savings/Goals screen
    case 'review_category':
    case 'review_spending':
      return 'transactions'; // Activity/Transactions screen
    case 'set_limit':
      return 'limits';
    case 'enable_cooling':
      return 'limits';
    default:
      return null;
  }
};

// Haptic feedback helper (only on native platforms)
const triggerHaptic = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      // Dynamic import to avoid errors if package not installed
      const hapticsModule = await import("@capacitor/haptics" as any);
      if (hapticsModule?.Haptics) {
        await hapticsModule.Haptics.impact({ style: hapticsModule.ImpactStyle?.Light || 'light' });
      }
    } catch (err) {
      // Silently fail if haptics not available
      console.debug('Haptics not available:', err);
    }
  }
};

export const AICopilotPanel: React.FC<AICopilotPanelProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { transactions, balance, currency, limits, goals, lang, t, setActiveScreen } = useApp();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAnalyzed, setLastAnalyzed] = useState<Date | null>(null);
  
  const handleActionClick = async (action?: string, actionLabel?: string) => {
    if (!action) return;
    
    // Trigger haptic feedback on tap
    await triggerHaptic();
    
    const screen = getActionRoute(action);
    if (screen) {
      // Close the modal first
      onClose();
      // Navigate using React Router (with hash for state-based navigation)
      navigate(`#${screen}`, { replace: false });
      // Also update the active screen in context
      setActiveScreen(screen as any);
    }
  };

  const labels = {
    title: t.aiCopilot,
    subtitle: t.aiCopilotSubtitle,
    analyzing: t.analyzingFinances,
    refresh: t.refreshAnalysis,
    noInsights: t.noWarnings,
    lastUpdated: t.updated,
    errorMsg: t.analysisError,
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
        transactions: transactions.slice(0, 100), // Last 100 transactions
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
      console.error('AI Copilot error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [transactions, balance, currency, limits, goals, lang]);

  // Analyze on open
  useEffect(() => {
    if (isOpen && !lastAnalyzed) {
      analyzeFinances();
    }
  }, [isOpen, lastAnalyzed, analyzeFinances]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-background rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-border bg-gradient-to-br from-primary/10 to-accent/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
                <Brain className="w-6 h-6 text-primary-foreground" />
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

          {lastAnalyzed && (
            <p className="text-xs text-muted-foreground mt-2">
              {labels.lastUpdated}: {lastAnalyzed.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center mb-4"
              >
                <Brain className="w-8 h-8 text-primary-foreground" />
              </motion.div>
              <p className="text-muted-foreground text-center">{labels.analyzing}</p>
              <div className="flex gap-1 mt-3">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    className="w-2 h-2 rounded-full bg-primary"
                  />
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <p className="text-destructive font-medium">{labels.errorMsg}</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
              <button
                onClick={analyzeFinances}
                className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {labels.refresh}
              </button>
            </div>
          ) : insights.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-income/10 flex items-center justify-center mb-4">
                <Trophy className="w-8 h-8 text-income" />
              </div>
              <p className="text-foreground font-medium">{labels.noInsights}</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {insights.map((insight, index) => (
                <motion.div
                  key={`${insight.type}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-2xl border-2 ${SEVERITY_COLORS[insight.severity]}`}
                >
                  <div className="flex gap-3">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                      insight.severity === 'critical' ? 'bg-destructive/20' :
                      insight.severity === 'high' ? 'bg-orange-500/20' :
                      insight.severity === 'medium' ? 'bg-amber-500/20' :
                      'bg-secondary'
                    } ${SEVERITY_ICON_COLORS[insight.severity]}`}>
                      {insight.icon ? (
                        <span className="text-xl">{insight.icon}</span>
                      ) : (
                        INSIGHT_ICONS[insight.type] || <Zap className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold ${
                        insight.severity === 'critical' ? 'text-destructive' :
                        insight.severity === 'high' ? 'text-orange-600 dark:text-orange-400' :
                        'text-foreground'
                      }`}>
                        {insight.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        {insight.message}
                      </p>
                      {insight.actionLabel && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleActionClick(insight.action, insight.actionLabel);
                          }}
                          onTouchStart={(e) => {
                            // Ensure touch events work on mobile
                            e.stopPropagation();
                          }}
                          className="mt-3 w-full sm:w-auto px-4 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 active:bg-primary/30 border border-primary/20 hover:border-primary/30 text-primary font-medium flex items-center justify-center gap-2 transition-all duration-200 relative z-20 touch-manipulation select-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                          role="button"
                          aria-label={insight.actionLabel}
                          type="button"
                        >
                          <span>{insight.actionLabel}</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        {!loading && insights.length > 0 && (
          <div className="p-4 border-t border-border">
            <button
              onClick={analyzeFinances}
              className="w-full py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              {labels.refresh}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AICopilotPanel;
