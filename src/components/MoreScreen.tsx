import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { safeJSON } from "@/lib/storage";
import { 
  Target, 
  CreditCard, 
  PieChart, 
  Wallet, 
  TrendingUp,
  Calculator,
  Receipt,
  Users,
  Repeat,
  FileText,
  DollarSign,
  ArrowLeft,
  Settings,
  Search,
  Star,
  X
} from "lucide-react";
import { ScreenType } from "@/types";

interface ToolItem {
  screen: ScreenType;
  labelKey: string;
  descKey: string;
  icon: React.ReactNode;
  color: string;
}

const TOOLS: ToolItem[] = [
  {
    screen: "analytics",
    labelKey: "toolAnalytics",
    descKey: "toolAnalyticsDesc",
    icon: <PieChart className="w-6 h-6" />,
    color: "from-amber-500 to-orange-500",
  },
  {
    screen: "limits",
    labelKey: "toolLimits",
    descKey: "toolLimitsDesc",
    icon: <Target className="w-6 h-6" />,
    color: "from-red-500 to-rose-500",
  },
  {
    screen: "accounts",
    labelKey: "toolAccounts",
    descKey: "toolAccountsDesc",
    icon: <Wallet className="w-6 h-6" />,
    color: "from-cyan-500 to-blue-500",
  },
  {
    screen: "reports",
    labelKey: "toolReports",
    descKey: "toolReportsDesc",
    icon: <FileText className="w-6 h-6" />,
    color: "from-violet-500 to-purple-500",
  },
  {
    screen: "subscriptions",
    labelKey: "toolSubscriptions",
    descKey: "toolSubscriptionsDesc",
    icon: <Repeat className="w-6 h-6" />,
    color: "from-pink-500 to-rose-500",
  },
  {
    screen: "recurring",
    labelKey: "toolRecurring",
    descKey: "toolRecurringDesc",
    icon: <Receipt className="w-6 h-6" />,
    color: "from-amber-500 to-orange-500",
  },
  {
    screen: "bill-split",
    labelKey: "toolBillSplit",
    descKey: "toolBillSplitDesc",
    icon: <Users className="w-6 h-6" />,
    color: "from-green-500 to-emerald-500",
  },
  {
    screen: "net-worth",
    labelKey: "toolNetWorth",
    descKey: "toolNetWorthDesc",
    icon: <TrendingUp className="w-6 h-6" />,
    color: "from-blue-500 to-indigo-500",
  },
  {
    screen: "investments",
    labelKey: "toolInvestments",
    descKey: "toolInvestmentsDesc",
    icon: <PieChart className="w-6 h-6" />,
    color: "from-emerald-500 to-teal-500",
  },
  {
    screen: "cash-flow",
    labelKey: "toolCashFlow",
    descKey: "toolCashFlowDesc",
    icon: <DollarSign className="w-6 h-6" />,
    color: "from-lime-500 to-green-500",
  },
  {
    screen: "envelopes",
    labelKey: "toolEnvelopes",
    descKey: "toolEnvelopesDesc",
    icon: <CreditCard className="w-6 h-6" />,
    color: "from-yellow-500 to-amber-500",
  },
  {
    screen: "debt-assessment",
    labelKey: "toolDebtAssessment",
    descKey: "toolDebtAssessmentDesc",
    icon: <Calculator className="w-6 h-6" />,
    color: "from-red-600 to-red-400",
  },
  {
    screen: "debt-payoff",
    labelKey: "toolDebtPayoff",
    descKey: "toolDebtPayoffDesc",
    icon: <Target className="w-6 h-6" />,
    color: "from-orange-500 to-red-500",
  },
  {
    screen: "settings",
    labelKey: "toolSettings",
    descKey: "toolSettingsDesc",
    icon: <Settings className="w-6 h-6" />,
    color: "from-slate-500 to-zinc-600",
  },
];

const STORAGE_KEY = "hamyon_tool_usage";

interface ToolUsage {
  [screen: string]: number;
}

export const MoreScreen: React.FC = () => {
  const { setActiveScreen, t } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [toolUsage, setToolUsage] = useState<ToolUsage>(() => 
    safeJSON.get(STORAGE_KEY, {})
  );

  // Track tool usage when navigating
  const handleToolClick = (screen: ScreenType) => {
    const newUsage = {
      ...toolUsage,
      [screen]: (toolUsage[screen] || 0) + 1
    };
    setToolUsage(newUsage);
    safeJSON.set(STORAGE_KEY, newUsage);
    setActiveScreen(screen);
  };

  // Get frequently used tools (top 4 with at least 1 usage)
  const frequentlyUsed = useMemo(() => {
    const entries = Object.entries(toolUsage)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
    
    return entries
      .map(([screen]) => TOOLS.find(t => t.screen === screen))
      .filter(Boolean) as ToolItem[];
  }, [toolUsage]);

  // Get translated label
  const getLabel = (key: string): string => {
    return (t as any)[key] || key;
  };

  // Filter tools by search
  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return TOOLS;
    const query = searchQuery.toLowerCase();
    return TOOLS.filter(tool => 
      getLabel(tool.labelKey).toLowerCase().includes(query) ||
      getLabel(tool.descKey).toLowerCase().includes(query)
    );
  }, [searchQuery, t]);

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="px-4 pt-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveScreen("home")}
            className="w-10 h-10 rounded-full bg-card flex items-center justify-center shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          <h1 className="text-2xl font-bold">{getLabel("tools")}</h1>
        </div>

        {/* Search Bar */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={getLabel("search") + "..."}
            className="w-full pl-10 pr-10 py-3 rounded-xl bg-card border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Frequently Used Section */}
        <AnimatePresence>
          {frequentlyUsed.length > 0 && !searchQuery && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-muted-foreground">
                  {getLabel("frequentlyUsed")}
                </h2>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                {frequentlyUsed.map((tool) => (
                  <motion.button
                    key={tool.screen}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleToolClick(tool.screen)}
                    className="flex-shrink-0 bg-card rounded-xl p-3 flex items-center gap-3 min-w-[160px] shadow-sm border border-border/30"
                  >
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${tool.color} flex items-center justify-center text-white`}>
                      {tool.icon}
                    </div>
                    <span className="font-medium text-sm text-foreground">
                      {getLabel(tool.labelKey)}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* All Tools Section Header */}
        {!searchQuery && (
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            {getLabel("allTools")}
          </h2>
        )}

        {/* Tools Grid */}
        <div className="grid grid-cols-2 gap-3">
          {filteredTools.map((tool, index) => (
            <motion.button
              key={tool.screen}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleToolClick(tool.screen)}
              className="bg-card rounded-2xl p-4 text-left relative overflow-hidden shadow-sm border border-border/30"
            >
              {/* Gradient accent */}
              <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${tool.color} opacity-10 rounded-full -translate-y-6 translate-x-6`} />
              
              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center text-white mb-3`}>
                {tool.icon}
              </div>
              
              {/* Text */}
              <h3 className="font-semibold text-foreground mb-1">
                {getLabel(tool.labelKey)}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {getLabel(tool.descKey)}
              </p>
            </motion.button>
          ))}
        </div>

        {/* Empty state for search */}
        {filteredTools.length === 0 && searchQuery && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">{t.empty}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MoreScreen;
