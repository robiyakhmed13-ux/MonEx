import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { formatUZS, todayISO, startOfWeekISO, monthPrefix } from "@/lib/storage";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ArrowLeft, FileText } from "lucide-react";

interface TransactionsScreenProps {
  onEditTransaction: (id: string) => void;
}

export const TransactionsScreen: React.FC<TransactionsScreenProps> = ({ onEditTransaction }) => {
  const { t, transactions, getCat, catLabel, deleteTransaction, setActiveScreen } = useApp();
  const [filter, setFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const today = todayISO();
  const weekStart = startOfWeekISO();
  const month = monthPrefix();
  
  const filtered = useMemo(() => {
    const base = [...transactions];
    if (filter === "all") return base;
    if (filter === "expense") return base.filter((x) => x.type === "expense");
    if (filter === "income") return base.filter((x) => x.type === "income");
    if (filter === "today") return base.filter((x) => x.date === today);
    if (filter === "week") return base.filter((x) => x.date >= weekStart);
    if (filter === "month") return base.filter((x) => x.date.startsWith(month));
    return base;
  }, [filter, transactions, today, weekStart, month]);
  
  const handleDelete = async () => {
    if (deleteId) {
      await deleteTransaction(deleteId);
      setDeleteId(null);
    }
  };
  
  return (
    <div className="screen-container">
      {/* Large Title - Screen purpose */}
      <header className="screen-header">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveScreen("home")}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center active:opacity-70"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-large-title text-foreground">{t.allTransactions}</h1>
            <p className="text-caption">{filtered.length} {t.transactions?.toLowerCase() || 'items'}</p>
          </div>
        </div>
      </header>
      
      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 pb-1">
        {[
          { k: "all", label: t.all },
          { k: "expense", label: t.expense },
          { k: "income", label: t.incomeType },
          { k: "today", label: t.today },
          { k: "week", label: t.week },
          { k: "month", label: t.month },
        ].map((x) => (
          <button
            key={x.k}
            onClick={() => setFilter(x.k)}
            className={`px-4 py-2 rounded-xl whitespace-nowrap text-body-medium transition-opacity active:opacity-70 ${
              filter === x.k
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>
      
      {/* Primary Section: Transaction List */}
      {filtered.length === 0 ? (
        <div className="card-info text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-secondary flex items-center justify-center">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-body text-muted-foreground">{t.empty}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((tx, index) => {
            const cat = getCat(tx.categoryId);
            return (
              <motion.div 
                key={tx.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02, duration: 0.2 }}
                className="card-info"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="category-icon"
                    style={{ backgroundColor: `${cat.color}15` }}
                  >
                    <CategoryIcon categoryId={cat.id} className="w-5 h-5" style={{ color: cat.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-medium text-foreground truncate">{tx.description}</p>
                    <p className="text-caption">{tx.date} • {catLabel(cat)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-body-medium ${tx.amount > 0 ? 'amount-income' : 'amount-expense'}`}>
                      {tx.amount > 0 ? '+' : ''}{formatUZS(tx.amount)}
                    </p>
                  </div>
                </div>
                {/* Actions */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                  <button 
                    onClick={() => onEditTransaction(tx.id)}
                    className="flex-1 py-2 rounded-xl bg-secondary text-body-medium text-foreground active:opacity-70"
                  >
                    {t.edit}
                  </button>
                  <button 
                    onClick={() => setDeleteId(tx.id)}
                    className="flex-1 py-2 rounded-xl bg-destructive/10 text-body-medium text-destructive active:opacity-70"
                  >
                    {t.delete}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
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
};