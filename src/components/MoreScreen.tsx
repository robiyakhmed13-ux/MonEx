import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { safeJSON, formatUZS } from "@/lib/storage";
import { 
  Target, CreditCard, PieChart, Wallet, TrendingUp, Calculator,
  Receipt, Users, Repeat, FileText, DollarSign, ArrowLeft,
  Settings, Search, Star, X, Brain, Sparkles, Flag, Plus,
  Calendar, ChevronRight
} from "lucide-react";
import { ScreenType } from "@/types";
import { AICopilotPanel } from "./AICopilotPanel";
import { FinancePlannerModal } from "./FinancePlannerModal";
import { BudgetSimulatorModal } from "./BudgetSimulatorModal";

interface ToolItem {
  screen: ScreenType;
  labelKey: string;
  descKey: string;
  icon: React.ReactNode;
  color: string;
}

const TOOLS: ToolItem[] = [
  { screen: "goals", labelKey: "toolGoals", descKey: "toolGoalsDesc", icon: <Flag className="w-6 h-6" />, color: "#22C55E" },
  { screen: "analytics", labelKey: "toolAnalytics", descKey: "toolAnalyticsDesc", icon: <PieChart className="w-6 h-6" />, color: "#F59E0B" },
  { screen: "limits", labelKey: "toolLimits", descKey: "toolLimitsDesc", icon: <Target className="w-6 h-6" />, color: "#EF4444" },
  { screen: "accounts", labelKey: "toolAccounts", descKey: "toolAccountsDesc", icon: <Wallet className="w-6 h-6" />, color: "#3B82F6" },
  { screen: "reports", labelKey: "toolReports", descKey: "toolReportsDesc", icon: <FileText className="w-6 h-6" />, color: "#8B5CF6" },
  { screen: "subscriptions", labelKey: "toolSubscriptions", descKey: "toolSubscriptionsDesc", icon: <Repeat className="w-6 h-6" />, color: "#EC4899" },
  { screen: "recurring", labelKey: "toolRecurring", descKey: "toolRecurringDesc", icon: <Receipt className="w-6 h-6" />, color: "#F97316" },
  { screen: "bill-split", labelKey: "toolBillSplit", descKey: "toolBillSplitDesc", icon: <Users className="w-6 h-6" />, color: "#10B981" },
  { screen: "net-worth", labelKey: "toolNetWorth", descKey: "toolNetWorthDesc", icon: <TrendingUp className="w-6 h-6" />, color: "#6366F1" },
  { screen: "investments", labelKey: "toolInvestments", descKey: "toolInvestmentsDesc", icon: <PieChart className="w-6 h-6" />, color: "#14B8A6" },
  { screen: "cash-flow", labelKey: "toolCashFlow", descKey: "toolCashFlowDesc", icon: <DollarSign className="w-6 h-6" />, color: "#84CC16" },
  { screen: "envelopes", labelKey: "toolEnvelopes", descKey: "toolEnvelopesDesc", icon: <CreditCard className="w-6 h-6" />, color: "#EAB308" },
  { screen: "debt-assessment", labelKey: "toolDebtAssessment", descKey: "toolDebtAssessmentDesc", icon: <Calculator className="w-6 h-6" />, color: "#DC2626" },
  { screen: "debt-payoff", labelKey: "toolDebtPayoff", descKey: "toolDebtPayoffDesc", icon: <Target className="w-6 h-6" />, color: "#EA580C" },
  { screen: "settings", labelKey: "toolSettings", descKey: "toolSettingsDesc", icon: <Settings className="w-6 h-6" />, color: "#64748B" },
];

const STORAGE_KEY = "hamyon_tool_usage";

export const MoreScreen: React.FC = () => {
  const { setActiveScreen, t, lang, goals, limits, getCat, catLabel, monthSpentByCategory, setActiveScreen: navigateTo } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [toolUsage, setToolUsage] = useState<Record<string, number>>(() => safeJSON.get(STORAGE_KEY, {}));
  const [showAICopilot, setShowAICopilot] = useState(false);
  const [showFinancePlanner, setShowFinancePlanner] = useState(false);
  const [showBudgetSimulator, setShowBudgetSimulator] = useState(false);
  
  const motionConfig = { duration: 0.2, ease: "easeOut" as const };

  const handleToolClick = (screen: ScreenType) => {
    const newUsage = { ...toolUsage, [screen]: (toolUsage[screen] || 0) + 1 };
    setToolUsage(newUsage);
    safeJSON.set(STORAGE_KEY, newUsage);
    setActiveScreen(screen);
  };

  const frequentlyUsed = useMemo(() => {
    return Object.entries(toolUsage)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([screen]) => TOOLS.find(t => t.screen === screen))
      .filter(Boolean) as ToolItem[];
  }, [toolUsage]);

  const getLabel = (key: string): string => (t as any)[key] || key;

  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return TOOLS;
    const query = searchQuery.toLowerCase();
    return TOOLS.filter(tool => 
      getLabel(tool.labelKey).toLowerCase().includes(query) ||
      getLabel(tool.descKey).toLowerCase().includes(query)
    );
  }, [searchQuery, t]);

  return (
    <div className="screen-container">
      {/* Premium Header */}
      <header className="screen-header">
        <h1 className="text-large-title text-foreground">
          {lang === "ru" ? "Планирование" : lang === "uz" ? "Rejalashtirish" : "Planning"}
        </h1>
        <p className="text-caption mt-1">
          {lang === "ru" ? "Ваши цели и инструменты" : lang === "uz" ? "Maqsadlaringiz va asboblar" : "Your goals and tools"}
        </p>
      </header>
      
      {/* HERO: Active Goals */}
      {goals.length > 0 && (
        <section className="mb-card">
          <div className="section-header">
            <h2 className="section-title">
              {lang === "ru" ? "Цели" : lang === "uz" ? "Maqsadlar" : "Goals"}
            </h2>
            <button onClick={() => navigateTo("goals")} className="section-action">
              {t.viewAll}
            </button>
          </div>
          <div className="space-y-[14px]">
            {goals.slice(0, 2).map((goal, index) => {
              const progress = goal.target ? Math.min((goal.current / goal.target) * 100, 100) : 0;
              return (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...motionConfig, delay: index * 0.03 }}
                  onClick={() => navigateTo("goals")}
                  className="card-elevated active:opacity-80"
                >
                  <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="text-xl">{goal.emoji || "🎯"}</span>
              </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body-medium text-foreground truncate">{goal.name}</p>
                      <p className="text-caption">{progress.toFixed(0)}%</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill progress-fill-success"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
          {goals.length > 2 && (
            <button
              onClick={() => navigateTo("goals")}
              className="mt-3 w-full py-2 text-caption text-primary text-center active:opacity-70"
            >
              {lang === "ru" ? `+${goals.length - 2} еще` : lang === "uz" ? `+${goals.length - 2} yana` : `+${goals.length - 2} more`}
            </button>
          )}
        </section>
      )}
      
      {/* Monthly Budgets */}
      {limits.length > 0 && (
        <section className="mb-card">
          <div className="section-header">
            <h2 className="section-title">
              {lang === "ru" ? "Бюджеты" : lang === "uz" ? "Byudjetlar" : "Budgets"}
            </h2>
            <button onClick={() => navigateTo("limits")} className="section-action">
              {t.viewAll}
            </button>
          </div>
          <div className="space-y-[14px]">
            {limits.slice(0, 2).map((lim, index) => {
              const cat = getCat(lim.categoryId);
              const spent = monthSpentByCategory(lim.categoryId);
              const pct = lim.amount ? Math.round((spent / lim.amount) * 100) : 0;
              const isOver = pct >= 100;
              return (
                <motion.div
                  key={lim.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...motionConfig, delay: index * 0.03 }}
                  onClick={() => navigateTo("limits")}
                  className="card-info active:opacity-80"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-body-medium text-foreground">{catLabel(cat)}</span>
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
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <section className="mb-card">
        <div className="section-header">
          <h2 className="section-title">
            {lang === "ru" ? "Быстрые действия" : lang === "uz" ? "Tezkor harakatlar" : "Quick Actions"}
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-card">
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...motionConfig, delay: 0.05 }}
            onClick={() => navigateTo("goals")}
            className="card-info text-left active:opacity-80"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <p className="text-body-medium text-foreground mb-1">
              {lang === "ru" ? "Цели" : lang === "uz" ? "Maqsadlar" : "Goals"}
            </p>
            <p className="text-caption">{goals.length} {lang === "ru" ? "активных" : lang === "uz" ? "faol" : "active"}</p>
          </motion.button>
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...motionConfig, delay: 0.08 }}
            onClick={() => navigateTo("limits")}
            className="card-info text-left active:opacity-80"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center mb-2">
              <CreditCard className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-body-medium text-foreground mb-1">
              {lang === "ru" ? "Бюджеты" : lang === "uz" ? "Byudjetlar" : "Budgets"}
            </p>
            <p className="text-caption">{limits.length} {lang === "ru" ? "установлено" : lang === "uz" ? "o'rnatilgan" : "set"}</p>
          </motion.button>
        </div>
      </section>

      {/* All Tools - Premium Grid */}
      <section>
        <div className="section-header">
          <h2 className="section-title">
            {lang === "ru" ? "Инструменты" : lang === "uz" ? "Asboblar" : "Tools"}
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-card">
          {filteredTools.map((tool, index) => (
            <motion.button
              key={tool.screen}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...motionConfig, delay: index * 0.02 }}
              onClick={() => handleToolClick(tool.screen)}
              className="card-info text-left active:opacity-80"
            >
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-2"
                style={{ backgroundColor: `${tool.color}15` }}
              >
                <div style={{ color: tool.color }}>
                  {tool.icon}
                </div>
              </div>
              <h3 className="text-body-medium text-foreground mb-1">{getLabel(tool.labelKey)}</h3>
              <p className="text-caption line-clamp-2">{getLabel(tool.descKey)}</p>
            </motion.button>
          ))}
        </div>
      </section>

      {/* AI Modals */}
      <AICopilotPanel isOpen={showAICopilot} onClose={() => setShowAICopilot(false)} />
      <FinancePlannerModal isOpen={showFinancePlanner} onClose={() => setShowFinancePlanner(false)} />
      <BudgetSimulatorModal isOpen={showBudgetSimulator} onClose={() => setShowBudgetSimulator(false)} />
    </div>
  );
};

export default MoreScreen;
