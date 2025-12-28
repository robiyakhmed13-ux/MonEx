import React, { useState, memo } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { formatUZS, clamp } from "@/lib/storage";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ArrowLeft, Target } from "lucide-react";

export const LimitsScreen = memo(() => {
  const { t, limits, allCats, getCat, catLabel, monthSpentByCategory, addLimit, updateLimit, deleteLimit, setActiveScreen } = useApp();
  
  // Local state for form - prevents re-renders during typing
  const [editId, setEditId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState(allCats.expense[0]?.id || "food");
  const [amount, setAmount] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const handleSave = () => {
    const amt = Number(amount);
    if (!categoryId || !amt) return;
    
    if (editId) {
      updateLimit(editId, { categoryId, amount: amt });
    } else {
      addLimit({ categoryId, amount: amt });
    }
    
    resetForm();
  };
  
  const resetForm = () => {
    setEditId(null);
    setCategoryId(allCats.expense[0]?.id || "food");
    setAmount("");
  };
  
  const startEdit = (lim: typeof limits[0]) => {
    setEditId(lim.id);
    setCategoryId(lim.categoryId);
    setAmount(String(lim.amount));
  };
  
  const handleDelete = () => {
    if (deleteId) {
      deleteLimit(deleteId);
      setDeleteId(null);
    }
  };
  
  return (
    <div className="screen-container pb-24 safe-top">
      <div className="px-4 pt-2">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setActiveScreen("home")}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </motion.button>
          <div className="flex-1">
            <h1 className="text-title-1 text-foreground">{t.limits}</h1>
            <p className="text-caption text-muted-foreground">
              {limits.length} {t.limits.toLowerCase()}
            </p>
          </div>
        </div>
        
        {/* Limits List */}
        <div className="space-y-3 mb-6">
          {limits.length === 0 ? (
            <div className="card-elevated p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <p className="text-muted-foreground">{t.noLimits}</p>
            </div>
          ) : (
            limits.map((lim) => {
              const cat = getCat(lim.categoryId);
              const spent = monthSpentByCategory(lim.categoryId);
              const pct = lim.amount ? Math.round((spent / lim.amount) * 100) : 0;
              const isOver = pct >= 100;
              const isNear = pct >= 80;
              
              return (
                <div key={lim.id} className="card-elevated p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="category-icon"
                        style={{ backgroundColor: `${cat.color}20` }}
                      >
                        <CategoryIcon categoryId={cat.id} className="w-5 h-5" style={{ color: cat.color }} />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{catLabel(cat)}</p>
                        <p className="text-caption text-muted-foreground">
                          {formatUZS(spent)} / {formatUZS(lim.amount)} UZS
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-title-2 font-bold ${isOver ? 'text-expense' : isNear ? 'text-warning' : 'text-income'}`}>
                        {clamp(pct, 0, 999)}%
                      </p>
                      <div className="flex gap-2 mt-1">
                        <button 
                          onClick={() => startEdit(lim)}
                          className="text-2xs px-2 py-1 rounded-lg bg-accent text-primary font-medium"
                        >
                          {t.edit}
                        </button>
                        <button 
                          onClick={() => setDeleteId(lim.id)}
                          className="text-2xs px-2 py-1 rounded-lg bg-red-50 text-expense font-medium"
                        >
                          {t.delete}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="progress-bar">
                    <motion.div
                      className="progress-fill"
                      style={{ 
                        backgroundColor: isOver ? 'hsl(var(--expense))' : isNear ? 'hsl(var(--warning))' : cat.color 
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${clamp(pct, 0, 100)}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        {/* Add/Edit Form */}
        <div className="card-elevated p-4">
          <h3 className="text-title-3 text-foreground mb-4">
            {editId ? t.edit : t.add}
          </h3>
          
          <div className="mb-4">
            <label className="text-caption text-muted-foreground font-medium mb-2 block">{t.category}</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="input-clean"
            >
              {allCats.expense.map((c) => (
                <option key={c.id} value={c.id}>
                  {catLabel(c)}
                </option>
              ))}
            </select>
          </div>
          
          <div className="mb-4">
            <label className="text-caption text-muted-foreground font-medium mb-2 block">{t.amount} (UZS)</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
              type="text"
              inputMode="numeric"
              className="input-clean"
              placeholder="500000"
            />
          </div>
          
          <div className="flex gap-3">
            <button onClick={resetForm} className="btn-secondary flex-1">{t.cancel}</button>
            <button onClick={handleSave} className="btn-primary flex-1">{t.save}</button>
          </div>
        </div>
      </div>
      
      {/* Delete Confirmation */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div 
            className="absolute bottom-0 left-0 right-0 modal-content safe-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-title-2 text-foreground mb-4">{t.confirmDelete}</h3>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">{t.cancel}</button>
              <button onClick={handleDelete} className="flex-1 py-4 rounded-xl bg-destructive text-destructive-foreground font-semibold">{t.delete}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

LimitsScreen.displayName = "LimitsScreen";
