import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
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
    <div className="screen-container pb-32 safe-top">
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
            <h1 className="text-title-1 text-foreground">{t.allTransactions}</h1>
            <p className="text-caption text-muted-foreground">
              {filtered.length} {t.transactions.toLowerCase()}
            </p>
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 pb-2">
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
              className={`px-4 py-2 rounded-full whitespace-nowrap font-medium text-body-sm transition-all ${
                filter === x.k
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>
        
        {/* Transaction List */}
        {filtered.length === 0 ? (
          <div className="card-elevated p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-muted flex items-center justify-center">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">{t.empty}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((tx) => {
              const cat = getCat(tx.categoryId);
              return (
                <motion.div 
                  key={tx.id}
                  className="list-item"
                >
                  <div 
                    className="category-icon"
                    style={{ backgroundColor: `${cat.color}20` }}
                  >
                    <CategoryIcon categoryId={cat.id} className="w-5 h-5" style={{ color: cat.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{tx.description}</p>
                    <p className="text-caption text-muted-foreground">{tx.date} • {catLabel(cat)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${tx.amount > 0 ? 'amount-income' : 'amount-expense'}`}>
                      {tx.amount > 0 ? '+' : ''}{formatUZS(tx.amount)}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <button 
                        onClick={() => onEditTransaction(tx.id)}
                        className="text-2xs px-2 py-1 rounded-lg bg-accent text-primary font-medium"
                      >
                        {t.edit}
                      </button>
                      <button 
                        onClick={() => setDeleteId(tx.id)}
                        className="text-2xs px-2 py-1 rounded-lg bg-red-50 text-expense font-medium"
                      >
                        {t.delete}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
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
};
