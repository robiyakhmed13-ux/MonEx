import React, { useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { formatUZS, clamp } from "@/lib/storage";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ArrowLeft, Target, Plus } from "lucide-react";

export const LimitsScreen = memo(() => {
  const { t, limits, allCats, getCat, catLabel, monthSpentByCategory, addLimit, updateLimit, deleteLimit, setActiveScreen } = useApp();
  
  const [editId, setEditId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState(allCats.expense[0]?.id || "food");
  const [amount, setAmount] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  
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
    setShowForm(false);
  };
  
  const startEdit = (lim: typeof limits[0]) => {
    setEditId(lim.id);
    setCategoryId(lim.categoryId);
    setAmount(String(lim.amount));
    setShowForm(true);
  };
  
  const handleDelete = () => {
    if (deleteId) {
      deleteLimit(deleteId);
      setDeleteId(null);
    }
  };
  
  return (
    <div className="screen-container">
      {/* Large Title */}
      <header className="screen-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveScreen("home")}
              className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center active:opacity-70"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div>
              <h1 className="text-large-title text-foreground">{t.limits}</h1>
              <p className="text-caption">{limits.length} {t.limits?.toLowerCase() || 'limits'}</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:opacity-70"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </header>
      
      {/* Primary Section: Limits List */}
      <div className="space-y-3 mb-6">
        {limits.length === 0 ? (
          <div className="card-info text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Target className="w-8 h-8 text-primary" />
            </div>
            <p className="text-body text-muted-foreground mb-4">{t.noLimits}</p>
            <button onClick={() => setShowForm(true)} className="btn-primary">
              {t.add}
            </button>
          </div>
        ) : (
          limits.map((lim, index) => {
            const cat = getCat(lim.categoryId);
            const spent = monthSpentByCategory(lim.categoryId);
            const pct = lim.amount ? Math.round((spent / lim.amount) * 100) : 0;
            const isOver = pct >= 100;
            const isNear = pct >= 80;
            
            return (
              <motion.div 
                key={lim.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.2 }}
                className="card-info"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="category-icon"
                      style={{ backgroundColor: `${cat.color}15` }}
                    >
                      <CategoryIcon categoryId={cat.id} className="w-5 h-5" style={{ color: cat.color }} />
                    </div>
                    <div>
                      <p className="text-body-medium text-foreground">{catLabel(cat)}</p>
                      <p className="text-caption">{formatUZS(spent)} / {formatUZS(lim.amount)}</p>
                    </div>
                  </div>
                  <span className={`text-title ${isOver ? 'amount-expense' : isNear ? 'text-amber-500' : 'amount-income'}`}>
                    {clamp(pct, 0, 999)}%
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="progress-bar mb-3">
                  <div
                    className={`progress-fill ${isOver ? 'progress-fill-danger' : ''}`}
                    style={{ 
                      width: `${clamp(pct, 0, 100)}%`,
                      backgroundColor: isOver ? undefined : isNear ? 'hsl(45 93% 47%)' : cat.color
                    }}
                  />
                </div>
                
                {/* Actions */}
                <div className="flex gap-2">
                  <button 
                    onClick={() => startEdit(lim)}
                    className="flex-1 py-2 rounded-xl bg-secondary text-body-medium text-foreground active:opacity-70"
                  >
                    {t.edit}
                  </button>
                  <button 
                    onClick={() => setDeleteId(lim.id)}
                    className="flex-1 py-2 rounded-xl bg-destructive/10 text-body-medium text-destructive active:opacity-70"
                  >
                    {t.delete}
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
      
      {/* Add/Edit Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={resetForm}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.25 }}
              className="absolute bottom-0 left-0 right-0 modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-6" />
              <h3 className="text-title text-foreground mb-4">
                {editId ? t.edit : t.add}
              </h3>
              
              <div className="mb-4">
                <label className="text-caption mb-2 block">{t.category}</label>
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
              
              <div className="mb-6">
                <label className="text-caption mb-2 block">{t.amount} (UZS)</label>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
                  type="text"
                  inputMode="numeric"
                  className="input-clean text-display"
                  placeholder="500000"
                />
              </div>
              
              <div className="flex gap-3">
                <button onClick={resetForm} className="btn-secondary flex-1">{t.cancel}</button>
                <button onClick={handleSave} className="btn-primary flex-1">{t.save}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay" 
            onClick={() => setDeleteId(null)}
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.25 }}
              className="absolute bottom-0 left-0 right-0 modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-title text-foreground mb-4">{t.confirmDelete}</h3>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">{t.cancel}</button>
                <button 
                  onClick={handleDelete} 
                  className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground text-body-medium active:opacity-70"
                >
                  {t.delete}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

LimitsScreen.displayName = "LimitsScreen";