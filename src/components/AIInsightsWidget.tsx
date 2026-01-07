import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import { RefreshCw, CheckCircle } from "lucide-react";

/**
 * AI Insights Widget - Design System Rules:
 * - Card radius 16-20, padding 16, spacing 12-16
 * - No borders, soft shadow or divider
 * - One idea per card
 * - Max 2 text sizes per card
 * - Auto-refresh every 6 hours
 * - Store lastUpdated timestamp
 */

interface Insight {
  id: string;
  emoji: string;
  text: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action?: string;
}

const CACHE_KEY = 'monex_insights_cache';
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

interface AIInsightsWidgetProps {
  onOpenFullPanel: () => void;
}

export const AIInsightsWidget: React.FC<AIInsightsWidgetProps> = ({ onOpenFullPanel }) => {
  const { transactions, balance, lang, session } = useApp();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // Labels in correct language based on lang setting
  const labels = {
    title: lang === 'ru' ? 'AI Инсайты' : lang === 'uz' ? 'AI Tushunchalar' : 'AI Insights',
    viewAll: lang === 'ru' ? 'Ещё' : lang === 'uz' ? 'Ko\'proq' : 'More',
    noInsights: lang === 'ru' ? 'Всё в порядке' : lang === 'uz' ? 'Hammasi yaxshi' : 'All good',
    analyzing: lang === 'ru' ? 'Анализ...' : lang === 'uz' ? 'Tahlil...' : 'Analyzing...',
  };

  const fetchInsights = useCallback(async (force = false) => {
    // Check if authenticated
    if (!session) {
      setInsights([]);
      return;
    }

    // Check cache first (unless forced)
    if (!force) {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          const cacheAge = Date.now() - parsed.timestamp;
          
          // Use cache if less than 6 hours old
          if (cacheAge < CACHE_TTL) {
            setInsights(parsed.insights || []);
            setLastUpdated(parsed.timestamp);
            return;
          }
        }
      } catch (e) {
        // Invalid cache, continue to fetch
      }
    }

    // If no transactions, return empty (but don't show error)
    if (transactions.length === 0) {
      setInsights([]);
      setLastUpdated(Date.now());
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        insights: [],
        timestamp: Date.now(),
      }));
      return;
    }

    setLoading(true);

    try {
      const data = await api.insights({
        transactions: transactions.map(tx => ({
          id: tx.id,
          type: tx.type,
          amount: tx.amount,
          categoryId: tx.categoryId,
          description: tx.description,
          date: tx.date,
          time: tx.time,
        })),
        balance,
        lang,
      });

      if (data?.insights && !data?.error) {
        const newInsights = Array.isArray(data.insights) ? data.insights : [];
        setInsights(newInsights);
        const timestamp = Date.now();
        setLastUpdated(timestamp);
        
        // Cache the results
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          insights: newInsights,
          timestamp,
        }));
      } else if (data?.error) {
        console.error('Insights API error:', data.error);
        // On error, keep existing insights or show empty
        if (insights.length === 0) {
          setInsights([]);
        }
      }
    } catch (err) {
      console.error('AI Insights error:', err);
      // On error, keep existing insights or show empty
      if (insights.length === 0) {
        setInsights([]);
      }
    } finally {
      setLoading(false);
    }
  }, [transactions, balance, lang, session, insights.length]);

  // Check on mount if refresh is needed (>6 hours)
  useEffect(() => {
    const checkAndRefresh = () => {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          const cacheAge = Date.now() - parsed.timestamp;
          
          // If cache is older than 6 hours, refresh
          if (cacheAge >= CACHE_TTL) {
            fetchInsights(true);
          } else {
            // Use cached data
            setInsights(parsed.insights || []);
            setLastUpdated(parsed.timestamp);
          }
        } else {
          // No cache, fetch immediately
          fetchInsights(false);
        }
      } catch (e) {
        // Invalid cache, fetch immediately
        fetchInsights(false);
      }
    };

    checkAndRefresh();
  }, []); // Only run on mount

  // Auto-refresh every 6 hours
  useEffect(() => {
    const interval = setInterval(() => {
      fetchInsights(true);
    }, CACHE_TTL);
    return () => clearInterval(interval);
  }, [fetchInsights]);

  // Loading state - minimal
  if (loading && insights.length === 0) {
    return (
      <section className="mb-6">
        <div className="section-header">
          <h2 className="section-title">{labels.title}</h2>
        </div>
        <div className="bg-card rounded-[18px] p-4 shadow-[0_1px_3px_0_rgb(0_0_0_/_0.04),0_1px_2px_-1px_rgb(0_0_0_/_0.04)] flex items-center gap-3 animate-pulse">
          <div className="w-5 h-5 rounded-full bg-secondary" />
          <span className="text-body text-muted-foreground">{labels.analyzing}</span>
        </div>
      </section>
    );
  }

  // No insights - show simple "all good" message
  if (insights.length === 0) {
    return (
      <section className="mb-6">
        <div className="section-header">
          <h2 className="section-title">{labels.title}</h2>
        </div>
        <div className="bg-card rounded-[18px] p-4 shadow-[0_1px_3px_0_rgb(0_0_0_/_0.04),0_1px_2px_-1px_rgb(0_0_0_/_0.04)] flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-[hsl(var(--income))]" />
          <span className="text-body text-foreground">{labels.noInsights}</span>
        </div>
      </section>
    );
  }

  // Filter insights: Only show critical or high severity (premium - AI speaks rarely, but wisely)
  const criticalInsights = insights.filter(insight => 
    insight.severity === 'critical' || insight.severity === 'high'
  );
  
  // Show only the first critical insight (one card max)
  const displayInsight = criticalInsights.length > 0 ? criticalInsights[0] : null;

  // If no critical insights, show nothing (silence is premium)
  if (!displayInsight) {
    return null;
  }

  return (
    <section className="mb-card">
      {/* Single Critical Insight Card - Premium minimal */}
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        onClick={onOpenFullPanel}
        className="w-full text-left active:opacity-80"
      >
        <div className="card-insight">
          {/* Emoji */}
          <span className="text-2xl flex-shrink-0" role="img" aria-label={displayInsight.emoji}>
            {displayInsight.emoji}
          </span>
          
          {/* Text - One sentence only */}
          <p className="text-body text-foreground flex-1 line-clamp-2">
            {displayInsight.text}
          </p>
        </div>
      </motion.button>
    </section>
  );
};

export default AIInsightsWidget;
