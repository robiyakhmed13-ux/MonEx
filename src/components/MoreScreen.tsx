import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { safeJSON } from "@/lib/storage";
import { 
  Target, CreditCard, PieChart, Wallet, TrendingUp, Calculator,
  Receipt, Users, Repeat, FileText, DollarSign, ArrowLeft,
  Settings, Search, Star, X, Brain, Sparkles, Flag
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
  const { setActiveScreen, t, lang } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [toolUsage, setToolUsage] = useState<Record<string, number>>(() => safeJSON.get(STORAGE_KEY, {}));
  const [showAICopilot, setShowAICopilot] = useState(false);
  const [showFinancePlanner, setShowFinancePlanner] = useState(false);
  const [showBudgetSimulator, setShowBudgetSimulator] = useState(false);

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
      {/* Large Title */}
      <header className="screen-header">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveScreen("home")}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center active:opacity-70"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-large-title text-foreground">{getLabel("tools")}</h1>
        </div>
      </header>

      {/* AI Features Section */}
      <section className="mb-6">
        <div className="section-header">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h2 className="section-title">
              {lang === "ru" ? "AI Возможности" : lang === "uz" ? "AI Imkoniyatlar" : "AI Features"}
            </h2>
          </div>
        </div>

        <div className="space-y-3">
          {/* AI Copilot */}
          <button
            onClick={() => setShowAICopilot(true)}
            className="card-action w-full flex items-center gap-4 active:opacity-80"
          >
            <div className="w-12 h-12 rounded-xl bg-violet-500/15 flex items-center justify-center flex-shrink-0">
              <Brain className="w-6 h-6 text-violet-500" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-body-medium text-foreground">
                {lang === 'ru' ? 'AI Финансовый Копилот' : lang === 'uz' ? 'AI Moliyaviy Kopilot' : 'AI Financial Copilot'}
              </p>
              <p className="text-caption truncate">
                {lang === 'ru' ? 'Анализ поведения и прогнозы' : lang === 'uz' ? 'Xulq tahlili' : 'Behavioral analysis'}
              </p>
            </div>
            <span className="text-muted-foreground">→</span>
          </button>

          {/* Finance Planner */}
          <button
            onClick={() => setShowFinancePlanner(true)}
            className="card-action w-full flex items-center gap-4 active:opacity-80"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
              <Target className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-body-medium text-foreground">
                {lang === 'ru' ? 'Финансовый Планировщик' : lang === 'uz' ? 'Moliyaviy Rejalashtiruvchi' : 'Finance Planner'}
              </p>
              <p className="text-caption truncate">
                {lang === 'ru' ? 'Генератор целей и планов' : lang === 'uz' ? 'Maqsad yaratuvchi' : 'Goals & plans generator'}
              </p>
            </div>
            <span className="text-muted-foreground">→</span>
          </button>

          {/* Budget Simulator */}
          <button
            onClick={() => setShowBudgetSimulator(true)}
            className="card-action w-full flex items-center gap-4 active:opacity-80"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
              <Calculator className="w-6 h-6 text-amber-500" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-body-medium text-foreground">
                {lang === 'ru' ? 'Симулятор бюджета' : lang === 'uz' ? 'Byudjet simulyatori' : 'Budget Simulator'}
              </p>
              <p className="text-caption truncate">
                {lang === 'ru' ? 'Сценарии "что если"' : lang === 'uz' ? '"Nima bo\'lsa"' : '"What if" scenarios'}
              </p>
            </div>
            <span className="text-muted-foreground">→</span>
          </button>
        </div>
      </section>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`${getLabel("search")}...`}
          className="input-clean pl-12 pr-10"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground active:opacity-70"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Frequently Used */}
      <AnimatePresence>
        {frequentlyUsed.length > 0 && !searchQuery && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <div className="section-header">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                <h2 className="section-title">{getLabel("frequentlyUsed")}</h2>
              </div>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
              {frequentlyUsed.map((tool) => (
                <button
                  key={tool.screen}
                  onClick={() => handleToolClick(tool.screen)}
                  className="card-info min-w-[140px] flex items-center gap-3 active:opacity-70"
                >
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                    style={{ backgroundColor: tool.color }}
                  >
                    {tool.icon}
                  </div>
                  <span className="text-body-medium text-foreground">{getLabel(tool.labelKey)}</span>
                </button>
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* All Tools Section */}
      {!searchQuery && (
        <div className="section-header">
          <h2 className="section-title">{getLabel("allTools")}</h2>
        </div>
      )}

      {/* Tools Grid */}
      <div className="grid grid-cols-2 gap-3">
        {filteredTools.map((tool, index) => (
          <motion.button
            key={tool.screen}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.02, duration: 0.2 }}
            onClick={() => handleToolClick(tool.screen)}
            className="card-info text-left relative overflow-hidden active:opacity-70"
          >
            {/* Icon */}
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white mb-3"
              style={{ backgroundColor: tool.color }}
            >
              {tool.icon}
            </div>
            
            {/* Text */}
            <h3 className="text-body-medium text-foreground mb-1">{getLabel(tool.labelKey)}</h3>
            <p className="text-caption line-clamp-2">{getLabel(tool.descKey)}</p>
          </motion.button>
        ))}
      </div>

      {/* Empty state */}
      {filteredTools.length === 0 && searchQuery && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-caption">{t.empty}</p>
        </div>
      )}

      {/* AI Modals */}
      <AICopilotPanel isOpen={showAICopilot} onClose={() => setShowAICopilot(false)} />
      <FinancePlannerModal isOpen={showFinancePlanner} onClose={() => setShowFinancePlanner(false)} />
      <BudgetSimulatorModal isOpen={showBudgetSimulator} onClose={() => setShowBudgetSimulator(false)} />
    </div>
  );
};

export default MoreScreen;