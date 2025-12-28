import React from "react";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
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
  Settings
} from "lucide-react";
import { ScreenType } from "@/types";

interface ToolItem {
  screen: ScreenType;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const TOOLS: ToolItem[] = [
  {
    screen: "analytics",
    label: "Analytics",
    icon: <PieChart className="w-6 h-6" />,
    color: "from-amber-500 to-orange-500",
    description: "Spending insights"
  },
  {
    screen: "limits",
    label: "Spending Limits",
    icon: <Target className="w-6 h-6" />,
    color: "from-red-500 to-rose-500",
    description: "Set category budgets"
  },
  {
    screen: "accounts",
    label: "Accounts",
    icon: <Wallet className="w-6 h-6" />,
    color: "from-cyan-500 to-blue-500",
    description: "Manage your accounts"
  },
  {
    screen: "reports",
    label: "Reports",
    icon: <FileText className="w-6 h-6" />,
    color: "from-violet-500 to-purple-500",
    description: "Financial reports"
  },
  {
    screen: "subscriptions",
    label: "Subscriptions",
    icon: <Repeat className="w-6 h-6" />,
    color: "from-pink-500 to-rose-500",
    description: "Track recurring payments"
  },
  {
    screen: "recurring",
    label: "Recurring",
    icon: <Receipt className="w-6 h-6" />,
    color: "from-amber-500 to-orange-500",
    description: "Recurring transactions"
  },
  {
    screen: "bill-split",
    label: "Bill Split",
    icon: <Users className="w-6 h-6" />,
    color: "from-green-500 to-emerald-500",
    description: "Split expenses with friends"
  },
  {
    screen: "net-worth",
    label: "Net Worth",
    icon: <TrendingUp className="w-6 h-6" />,
    color: "from-blue-500 to-indigo-500",
    description: "Track total wealth"
  },
  {
    screen: "investments",
    label: "Investments",
    icon: <PieChart className="w-6 h-6" />,
    color: "from-emerald-500 to-teal-500",
    description: "Portfolio tracking"
  },
  {
    screen: "cash-flow",
    label: "Cash Flow",
    icon: <DollarSign className="w-6 h-6" />,
    color: "from-lime-500 to-green-500",
    description: "Forecast your balance"
  },
  {
    screen: "envelopes",
    label: "Envelopes",
    icon: <CreditCard className="w-6 h-6" />,
    color: "from-yellow-500 to-amber-500",
    description: "Envelope budgeting"
  },
  {
    screen: "debt-assessment",
    label: "Debt Assessment",
    icon: <Calculator className="w-6 h-6" />,
    color: "from-red-600 to-red-400",
    description: "Can you afford it?"
  },
  {
    screen: "debt-payoff",
    label: "Debt Payoff",
    icon: <Target className="w-6 h-6" />,
    color: "from-orange-500 to-red-500",
    description: "Payoff strategies"
  },
  {
    screen: "settings",
    label: "Settings",
    icon: <Settings className="w-6 h-6" />,
    color: "from-slate-500 to-zinc-600",
    description: "App preferences"
  },
];

export const MoreScreen: React.FC = () => {
  const { setActiveScreen, t } = useApp();

  return (
    <div className="screen-container pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveScreen("home")}
          className="w-10 h-10 rounded-full bg-card flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </motion.button>
        <h1 className="text-2xl font-bold">Tools</h1>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-2 gap-3">
        {TOOLS.map((tool, index) => (
          <motion.button
            key={tool.screen}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setActiveScreen(tool.screen)}
            className="bg-card rounded-2xl p-4 text-left relative overflow-hidden"
          >
            {/* Gradient accent */}
            <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${tool.color} opacity-10 rounded-full -translate-y-6 translate-x-6`} />
            
            {/* Icon */}
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center text-white mb-3`}>
              {tool.icon}
            </div>
            
            {/* Text */}
            <h3 className="font-semibold text-foreground mb-1">{tool.label}</h3>
            <p className="text-xs text-muted-foreground">{tool.description}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default MoreScreen;
