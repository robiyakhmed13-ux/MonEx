import React, { useState, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { todayISO } from "@/lib/storage";
import { ReceiptScanner } from "./ReceiptScanner";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editId?: string | null;
  initialType?: "expense" | "income" | "debt";
}

export const AddTransactionModal = memo(({ isOpen, onClose, editId, initialType = "expense" }: AddTransactionModalProps) => {
  const { t, allCats, getCat, catLabel, transactions, addTransaction, updateTransaction } = useApp();
  
  // Find existing transaction if editing
  const existingTx = editId ? transactions.find((tx) => tx.id === editId) : null;
  
  // Local state to prevent re-renders - this is key to fixing the keyboard issue
  const [type, setType] = useState<"expense" | "income" | "debt">(existingTx?.type || initialType);
  const [amount, setAmount] = useState(existingTx ? String(Math.abs(existingTx.amount)) : "");
  const [description, setDescription] = useState(existingTx?.description || "");
  const [categoryId, setCategoryId] = useState(existingTx?.categoryId || allCats[type][0]?.id || "food");
  const [date, setDate] = useState(existingTx?.date || todayISO());
  const [showScanner, setShowScanner] = useState(false);

  // Handle receipt scan result
  const handleScanComplete = useCallback((data: { amount?: number; description?: string; categoryId?: string; date?: string }) => {
    if (data.amount) setAmount(String(data.amount));
    if (data.description) setDescription(data.description);
    if (data.categoryId) setCategoryId(data.categoryId);
    if (data.date) setDate(data.date);
    setType("expense"); // Receipts are typically expenses
  }, []);
  
  const cats = allCats[type] || [];
  
  const handleTypeChange = useCallback((newType: "expense" | "income" | "debt") => {
    setType(newType);
    const defaultCat = allCats[newType]?.[0]?.id || "food";
    setCategoryId(defaultCat);
  }, [allCats]);
  
  const handleSave = useCallback(() => {
    const amtNum = Number(amount);
    if (!amtNum || !categoryId) return;
    
    // Determine sign
    let signed = amtNum;
    if (type === "expense") {
      signed = -Math.abs(amtNum);
    } else if (type === "income") {
      signed = Math.abs(amtNum);
    } else {
      // Debt: borrowed = positive (money in), lent = negative (money out)
      if (categoryId === "borrowed") signed = Math.abs(amtNum);
      else signed = -Math.abs(amtNum);
    }
    
    const now = new Date();
    const time = now.toISOString().slice(11, 16);
    
    if (editId) {
      updateTransaction(editId, {
        type,
        amount: signed,
        categoryId,
        description: description || catLabel(getCat(categoryId)),
        date,
      });
    } else {
      addTransaction({
        type,
        amount: signed,
        categoryId,
        description: description || catLabel(getCat(categoryId)),
        date,
        time,
        source: "app",
        remote: false,
      });
    }
    
    onClose();
  }, [amount, categoryId, type, description, date, editId, updateTransaction, addTransaction, getCat, catLabel, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <>
      {/* Receipt Scanner Modal */}
      <ReceiptScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScanComplete={handleScanComplete}
      />
      
      <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="modal-overlay"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="absolute bottom-0 left-0 right-0 modal-content safe-bottom"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-6" />
          
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-title-1 text-foreground">
              {editId ? t.editTransaction : t.addTransaction}
            </h2>
            <div className="flex items-center gap-2">
              {/* Scan Receipt Button */}
              {!editId && (
                <button
                  onClick={() => setShowScanner(true)}
                  className="h-10 px-4 rounded-full bg-gradient-to-r from-primary/10 to-accent flex items-center gap-2 text-primary font-medium text-sm hover:from-primary/20 transition-all"
                >
                  <span>📷</span>
                  <span className="hidden sm:inline">{t.scan || "Scan"}</span>
                </button>
              )}
              <button onClick={onClose} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                ✕
              </button>
            </div>
          </div>
          
          {/* Type Selector */}
          <div className="flex gap-2 mb-6">
            {[
              { k: "expense" as const, label: t.expense, icon: "↓", color: "expense" },
              { k: "income" as const, label: t.incomeType, icon: "↑", color: "income" },
              { k: "debt" as const, label: t.debtType, icon: "↔", color: "primary" },
            ].map((x) => (
              <button
                key={x.k}
                onClick={() => handleTypeChange(x.k)}
                className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-semibold transition-all ${
                  type === x.k
                    ? x.k === "expense"
                      ? "bg-red-50 text-expense border-2 border-expense"
                      : x.k === "income"
                      ? "bg-green-50 text-income border-2 border-income"
                      : "bg-accent text-primary border-2 border-primary"
                    : "bg-secondary text-muted-foreground border-2 border-transparent"
                }`}
              >
                <span className="text-lg">{x.icon}</span>
                <span className="text-sm">{x.label}</span>
              </button>
            ))}
          </div>
          
          {/* Amount Input */}
          <div className="mb-4">
            <label className="text-caption text-muted-foreground font-medium mb-2 block">{t.amount}</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="input-clean text-2xl font-bold"
              placeholder="0"
              autoFocus
            />
          </div>
          
          {/* Description */}
          <div className="mb-4">
            <label className="text-caption text-muted-foreground font-medium mb-2 block">{t.description}</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              type="text"
              className="input-clean"
              placeholder={catLabel(getCat(categoryId))}
            />
          </div>
          
          {/* Date */}
          <div className="mb-6">
            <label className="text-caption text-muted-foreground font-medium mb-2 block">{t.date}</label>
            <input
              value={date}
              onChange={(e) => setDate(e.target.value)}
              type="date"
              className="input-clean"
            />
          </div>
          
          {/* Category Grid */}
          <div className="mb-6">
            <label className="text-caption text-muted-foreground font-medium mb-3 block">{t.category}</label>
            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto no-scrollbar">
              {cats.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategoryId(c.id)}
                  className={`p-3 rounded-xl flex flex-col items-center gap-1.5 transition-all ${
                    categoryId === c.id
                      ? "bg-accent ring-2 ring-primary scale-105"
                      : "bg-secondary hover:bg-muted"
                  }`}
                >
                  <span className="text-xl">{c.emoji}</span>
                  <span className="text-2xs text-center truncate w-full text-muted-foreground">{catLabel(c)}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">
              {t.cancel}
            </button>
            <button onClick={handleSave} className="btn-primary flex-1">
              {t.save}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
    </>
  );
});

AddTransactionModal.displayName = "AddTransactionModal";
