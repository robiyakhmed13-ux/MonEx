import React, { useState, lazy, Suspense } from "react";
import { AppProvider, useApp } from "@/context/AppContext";
import { BottomNav } from "@/components/BottomNav";
import { HomeScreen } from "@/components/HomeScreen";
import { AddTransactionModal } from "@/components/AddTransactionModal";

// Lazy load screens for better performance
const TransactionsScreen = lazy(() => import("@/components/TransactionsScreen").then(m => ({ default: m.TransactionsScreen })));
const AnalyticsScreen = lazy(() => import("@/components/AnalyticsScreen"));
const LimitsScreen = lazy(() => import("@/components/LimitsScreen").then(m => ({ default: m.LimitsScreen })));
const SettingsScreen = lazy(() => import("@/components/SettingsScreen").then(m => ({ default: m.SettingsScreen })));

const LoadingFallback = () => (
  <div className="screen-container flex items-center justify-center">
    <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const HamyonAppContent: React.FC = () => {
  const { activeScreen } = useApp();
  
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

const HamyonApp: React.FC = () => (
  <AppProvider>
    <HamyonAppContent />
  </AppProvider>
);

export default HamyonApp;
