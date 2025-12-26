import React, { useState, lazy, Suspense } from "react";
import { useApp } from "@/context/AppContext";
import { BottomNav } from "@/components/BottomNav";
import { HomeScreen } from "@/components/HomeScreen";
import { AddTransactionModal } from "@/components/AddTransactionModal";
import { OnboardingFlow } from "@/components/OnboardingFlow";

// Lazy load screens for better performance
const TransactionsScreen = lazy(() => import("@/components/TransactionsScreen").then(m => ({ default: m.TransactionsScreen })));
const AnalyticsScreen = lazy(() => import("@/components/AnalyticsScreen"));
const LimitsScreen = lazy(() => import("@/components/LimitsScreen").then(m => ({ default: m.LimitsScreen })));
const GoalsScreen = lazy(() => import("@/components/GoalsScreen"));
const RecurringScreen = lazy(() => import("@/components/RecurringScreen"));
const SettingsScreen = lazy(() => import("@/components/SettingsScreen").then(m => ({ default: m.SettingsScreen })));

const LoadingFallback = () => (
  <div className="screen-container flex items-center justify-center">
    <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const HamyonApp: React.FC = () => {
  const { activeScreen, onboardingComplete, setOnboardingComplete } = useApp();
  
  // Modal states
  const [showAddTx, setShowAddTx] = useState(false);
  const [editTxId, setEditTxId] = useState<string | null>(null);
  const [txType, setTxType] = useState<"expense" | "income" | "debt">("expense");
  
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
    </div>
  );
};

export default HamyonApp;
