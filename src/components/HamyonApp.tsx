import React, { useState, lazy, Suspense } from "react";
import { useApp } from "@/context/AppContext";
import { BottomNav } from "@/components/BottomNav";
import { HomeScreen } from "@/components/HomeScreen";
import { AddTransactionModal } from "@/components/AddTransactionModal";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { useSmartNotifications } from "@/hooks/useSmartNotifications";
import { Bell } from "lucide-react";
import { motion } from "framer-motion";

// Lazy load screens for better performance
const TransactionsScreen = lazy(() => import("@/components/TransactionsScreen").then(m => ({ default: m.TransactionsScreen })));
const AnalyticsScreen = lazy(() => import("@/components/AnalyticsScreen"));
const LimitsScreen = lazy(() => import("@/components/LimitsScreen").then(m => ({ default: m.LimitsScreen })));
const GoalsScreen = lazy(() => import("@/components/GoalsScreen"));
const RecurringScreen = lazy(() => import("@/components/RecurringScreen"));
const SettingsScreen = lazy(() => import("@/components/SettingsScreen").then(m => ({ default: m.SettingsScreen })));
const AccountsScreen = lazy(() => import("@/components/AccountsScreen").then(m => ({ default: m.AccountsScreen })));
const ReportsScreen = lazy(() => import("@/components/ReportsScreen").then(m => ({ default: m.ReportsScreen })));
const DebtAssessmentScreen = lazy(() => import("@/components/DebtAssessmentScreen").then(m => ({ default: m.DebtAssessmentScreen })));
const SubscriptionsScreen = lazy(() => import("@/components/SubscriptionsScreen").then(m => ({ default: m.SubscriptionsScreen })));
const BillSplitScreen = lazy(() => import("@/components/BillSplitScreen").then(m => ({ default: m.BillSplitScreen })));
const NetWorthScreen = lazy(() => import("@/components/NetWorthScreen").then(m => ({ default: m.NetWorthScreen })));
const InvestmentsScreen = lazy(() => import("@/components/InvestmentsScreen").then(m => ({ default: m.InvestmentsScreen })));
const CashFlowScreen = lazy(() => import("@/components/CashFlowScreen").then(m => ({ default: m.CashFlowScreen })));
const EnvelopesScreen = lazy(() => import("@/components/EnvelopesScreen").then(m => ({ default: m.EnvelopesScreen })));
const DebtPayoffScreen = lazy(() => import("@/components/DebtPayoffScreen").then(m => ({ default: m.DebtPayoffScreen })));

const LoadingFallback = () => (
  <div className="screen-container flex items-center justify-center">
    <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const HamyonApp: React.FC = () => {
  const { activeScreen, onboardingComplete, setOnboardingComplete } = useApp();
  const { notifications, unreadCount, markAsRead, clearAll } = useSmartNotifications();
  
  // Modal states
  const [showAddTx, setShowAddTx] = useState(false);
  const [editTxId, setEditTxId] = useState<string | null>(null);
  const [txType, setTxType] = useState<"expense" | "income" | "debt">("expense");
  const [showNotifications, setShowNotifications] = useState(false);
  
  const openAddExpense = () => {
    setTxType("expense");
    setEditTxId(null);
    setShowAddTx(true);
  };
  
  const openAddIncome = () => {
    setTxType("income");
    setEditTxId(null);
    setShowAddTx(true);
  };
  
  const openEditTransaction = (id: string) => {
    setEditTxId(id);
    setShowAddTx(true);
  };
  
  const closeModal = () => {
    setShowAddTx(false);
    setEditTxId(null);
  };
  
  // Show onboarding for new users
  if (!onboardingComplete) {
    return <OnboardingFlow onComplete={() => setOnboardingComplete(true)} />;
  }
  
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Notification Bell - Fixed position */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowNotifications(true)}
        className="fixed top-4 right-4 z-40 w-10 h-10 rounded-full bg-card shadow-lg flex items-center justify-center"
      >
        <Bell className="w-5 h-5 text-foreground" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white text-xs rounded-full flex items-center justify-center font-bold"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </motion.button>

      {/* Main Content */}
      {activeScreen === "home" && (
        <HomeScreen onAddExpense={openAddExpense} onAddIncome={openAddIncome} />
      )}
      
      <Suspense fallback={<LoadingFallback />}>
        {activeScreen === "transactions" && (
          <TransactionsScreen onEditTransaction={openEditTransaction} />
        )}
        {activeScreen === "analytics" && <AnalyticsScreen />}
        {activeScreen === "limits" && <LimitsScreen />}
        {activeScreen === "goals" && <GoalsScreen />}
        {activeScreen === "recurring" && <RecurringScreen />}
        {activeScreen === "settings" && <SettingsScreen />}
        {activeScreen === "accounts" && <AccountsScreen />}
        {activeScreen === "reports" && <ReportsScreen />}
        {activeScreen === "debt-assessment" && <DebtAssessmentScreen />}
        {activeScreen === "subscriptions" && <SubscriptionsScreen />}
        {activeScreen === "bill-split" && <BillSplitScreen />}
        {activeScreen === "net-worth" && <NetWorthScreen />}
        {activeScreen === "investments" && <InvestmentsScreen />}
        {activeScreen === "cash-flow" && <CashFlowScreen />}
        {activeScreen === "envelopes" && <EnvelopesScreen />}
        {activeScreen === "debt-payoff" && <DebtPayoffScreen />}
      </Suspense>
      
      {/* Bottom Navigation */}
      <BottomNav onAddClick={openAddExpense} />
      
      {/* Add/Edit Transaction Modal */}
      <AddTransactionModal 
        isOpen={showAddTx} 
        onClose={closeModal}
        editId={editTxId}
        initialType={txType}
      />

      {/* Notifications Panel */}
      <NotificationsPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        onMarkAsRead={markAsRead}
        onClearAll={clearAll}
      />
    </div>
  );
};

export default HamyonApp;
