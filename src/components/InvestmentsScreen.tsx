import React, { useState, useMemo, memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { Investment } from "@/types";
import { safeJSON, uid } from "@/lib/storage";
import { formatCurrency } from "@/lib/exportData";
import { Plus, X, TrendingUp, TrendingDown, RefreshCw, Trash2, Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const INVESTMENT_TYPES = [
  { value: "stock", label: "Stock", emoji: "📈" },
  { value: "crypto", label: "Crypto", emoji: "₿" },
  { value: "etf", label: "ETF", emoji: "📊" },
  { value: "mutual_fund", label: "Mutual Fund", emoji: "💼" },
];

export const InvestmentsScreen = memo(() => {
  const { lang, currency, showToast, setActiveScreen } = useApp();
  const [investments, setInvestments] = useState<Investment[]>(() => 
    safeJSON.get("hamyon_investments", [])
  );
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<Investment["type"]>("stock");
  const [quantity, setQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");

  const t = {
    title: lang === "ru" ? "Инвестиции" : lang === "uz" ? "Investitsiyalar" : "Investments",
    addNew: lang === "ru" ? "Добавить" : lang === "uz" ? "Qo'shish" : "Add New",
    symbol: lang === "ru" ? "Тикер" : lang === "uz" ? "Tiker" : "Symbol",
    name: lang === "ru" ? "Название" : lang === "uz" ? "Nomi" : "Name",
    type: lang === "ru" ? "Тип" : lang === "uz" ? "Turi" : "Type",
    quantity: lang === "ru" ? "Количество" : lang === "uz" ? "Miqdor" : "Quantity",
    purchasePrice: lang === "ru" ? "Цена покупки" : lang === "uz" ? "Sotib olish narxi" : "Purchase Price",
    currentPrice: lang === "ru" ? "Текущая цена" : lang === "uz" ? "Joriy narx" : "Current Price",
    totalValue: lang === "ru" ? "Общая стоимость" : lang === "uz" ? "Jami qiymat" : "Total Value",
    gain: lang === "ru" ? "Прибыль/Убыток" : lang === "uz" ? "Foyda/Zarar" : "Gain/Loss",
    refresh: lang === "ru" ? "Обновить цены" : lang === "uz" ? "Narxlarni yangilash" : "Refresh Prices",
    save: lang === "ru" ? "Сохранить" : lang === "uz" ? "Saqlash" : "Save",
    noInvestments: lang === "ru" ? "Нет инвестиций" : lang === "uz" ? "Investitsiyalar yo'q" : "No investments",
    portfolio: lang === "ru" ? "Портфель" : lang === "uz" ? "Portfel" : "Portfolio",
  };

  // Calculate portfolio totals
  const portfolio = useMemo(() => {
    let totalValue = 0;
    let totalCost = 0;
    
    investments.forEach(inv => {
      const currentValue = (inv.currentPrice || inv.purchasePrice) * inv.quantity;
      const costBasis = inv.purchasePrice * inv.quantity;
      totalValue += currentValue;
      totalCost += costBasis;
    });
    
    const totalGain = totalValue - totalCost;
    const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
    
    return { totalValue, totalCost, totalGain, totalGainPercent };
  }, [investments]);

  const resetForm = () => {
    setSymbol("");
    setName("");
    setType("stock");
    setQuantity("");
    setPurchasePrice("");
    setEditingId(null);
  };

  const fetchPrice = async (symbol: string, invType: Investment["type"]): Promise<number | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('get-stock-price', {
        body: { symbol, type: invType === 'crypto' ? 'crypto' : 'stock' }
      });
      
      if (error) throw error;
      return data?.price || null;
    } catch (e) {
      console.error('Failed to fetch price:', e);
      return null;
    }
  };

  const refreshAllPrices = async () => {
    setLoading(true);
    const updated = await Promise.all(
      investments.map(async (inv) => {
        const price = await fetchPrice(inv.symbol, inv.type);
        return price ? { ...inv, currentPrice: price } : inv;
      })
    );
    setInvestments(updated);
    safeJSON.set("hamyon_investments", updated);
    setLoading(false);
    showToast("✓", true);
  };

  const handleSave = async () => {
    if (!symbol.trim() || !name.trim() || !quantity || !purchasePrice) return;
    
    setLoading(true);
    const currentPrice = await fetchPrice(symbol.toUpperCase(), type);
    
    const investment: Investment = {
      id: editingId || uid(),
      symbol: symbol.toUpperCase().trim(),
      name: name.trim(),
      type,
      quantity: parseFloat(quantity),
      purchasePrice: parseFloat(purchasePrice),
      purchaseDate: new Date().toISOString().slice(0, 10),
      currentPrice: currentPrice || parseFloat(purchasePrice),
      currency: "USD",
    };

    if (editingId) {
      setInvestments(prev => {
        const updated = prev.map(i => i.id === editingId ? investment : i);
        safeJSON.set("hamyon_investments", updated);
        return updated;
      });
    } else {
      setInvestments(prev => {
        const updated = [investment, ...prev];
        safeJSON.set("hamyon_investments", updated);
        return updated;
      });
    }
    
    setLoading(false);
    showToast("✓", true);
    setShowForm(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    setInvestments(prev => {
      const updated = prev.filter(i => i.id !== id);
      safeJSON.set("hamyon_investments", updated);
      return updated;
    });
    showToast("✓", true);
  };

  const openEdit = (inv: Investment) => {
    setSymbol(inv.symbol);
    setName(inv.name);
    setType(inv.type);
    setQuantity(inv.quantity.toString());
    setPurchasePrice(inv.purchasePrice.toString());
    setEditingId(inv.id);
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-background pb-32 px-4 pt-4">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveScreen("home")} className="text-2xl">←</button>
          <h1 className="text-xl font-bold text-foreground">{t.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={refreshAllPrices}
            disabled={loading || investments.length === 0}
            className="p-2 rounded-full bg-secondary text-foreground disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => { resetForm(); setShowForm(true); }}
            className="p-2 rounded-full bg-primary text-primary-foreground"
          >
            <Plus className="w-5 h-5" />
          </motion.button>
        </div>
      </header>

      {/* Portfolio Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-3xl bg-gradient-to-br from-primary/30 via-primary/10 to-transparent border border-primary/20 mb-6"
      >
        <p className="text-sm text-muted-foreground mb-2">{t.portfolio}</p>
        <div className="flex items-baseline gap-3 mb-4">
          <h2 className="text-3xl font-bold text-foreground">
            ${portfolio.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${
              portfolio.totalGain >= 0 ? 'bg-income/20 text-income' : 'bg-expense/20 text-expense'
            }`}
          >
            {portfolio.totalGain >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{portfolio.totalGainPercent >= 0 ? '+' : ''}{portfolio.totalGainPercent.toFixed(2)}%</span>
          </motion.div>
        </div>
        <p className={`text-lg font-medium ${portfolio.totalGain >= 0 ? 'text-income' : 'text-expense'}`}>
          {portfolio.totalGain >= 0 ? '+' : ''}${portfolio.totalGain.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </motion.div>

      {/* Investments List */}
      {investments.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          <span className="text-4xl block mb-3">📊</span>
          <p>{t.noInvestments}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {investments.map((inv, index) => {
            const currentValue = (inv.currentPrice || inv.purchasePrice) * inv.quantity;
            const costBasis = inv.purchasePrice * inv.quantity;
            const gain = currentValue - costBasis;
            const gainPercent = costBasis > 0 ? (gain / costBasis) * 100 : 0;
            const typeInfo = INVESTMENT_TYPES.find(t => t.value === inv.type);

            return (
              <motion.div
                key={inv.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 rounded-2xl bg-card border border-border"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{typeInfo?.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{inv.symbol}</span>
                      <span className="text-sm text-muted-foreground">{inv.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {inv.quantity} × ${inv.currentPrice?.toFixed(2) || inv.purchasePrice.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">
                      ${currentValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <p className={`text-sm font-medium ${gain >= 0 ? 'text-income' : 'text-expense'}`}>
                      {gain >= 0 ? '+' : ''}{gainPercent.toFixed(2)}%
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-border">
                  <button onClick={() => openEdit(inv)} className="p-2 rounded-lg bg-secondary text-foreground">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(inv.id)} className="p-2 rounded-lg bg-destructive/20 text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              onClick={e => e.stopPropagation()}
              className="bg-background rounded-t-3xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto"
              style={{ paddingBottom: 'calc(1.5rem + 80px + env(safe-area-inset-bottom))' }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">{editingId ? t.save : t.addNew}</h2>
                <button onClick={() => setShowForm(false)} className="p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t.type}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {INVESTMENT_TYPES.map(it => (
                      <button
                        key={it.value}
                        onClick={() => setType(it.value as Investment["type"])}
                        className={`p-3 rounded-xl flex items-center gap-2 ${type === it.value ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
                      >
                        <span>{it.emoji}</span>
                        <span className="text-sm font-medium">{it.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Symbol */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t.symbol}</label>
                  <input
                    type="text"
                    value={symbol}
                    onChange={e => setSymbol(e.target.value.toUpperCase())}
                    placeholder="AAPL, BTC, SPY..."
                    className="w-full p-3 rounded-xl bg-secondary border border-border text-foreground uppercase"
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t.name}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Apple Inc., Bitcoin..."
                    className="w-full p-3 rounded-xl bg-secondary border border-border text-foreground"
                  />
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t.quantity}</label>
                  <input
                    type="number"
                    step="any"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    placeholder="0"
                    className="w-full p-3 rounded-xl bg-secondary border border-border text-foreground"
                  />
                </div>

                {/* Purchase Price */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t.purchasePrice} (USD)</label>
                  <input
                    type="number"
                    step="any"
                    value={purchasePrice}
                    onChange={e => setPurchasePrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-3 rounded-xl bg-secondary border border-border text-foreground"
                  />
                </div>

                {/* Save Button */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  disabled={!symbol.trim() || !name.trim() || !quantity || !purchasePrice || loading}
                  className="w-full p-4 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {t.save}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default InvestmentsScreen;
