import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, ReactNode } from "react";
import { I18N, DEFAULT_CATEGORIES, LangKey, Translation, Category, CategoryType } from "@/lib/constants";
import { safeJSON, uid, todayISO, startOfWeekISO, monthPrefix, formatUZS, clamp, sb } from "@/lib/storage";
import { Transaction, Limit, Goal, TelegramUser, ScreenType } from "@/types";

interface AppState {
  lang: LangKey;
  t: Translation;
  setLang: (l: LangKey) => void;
  
  tgUser: TelegramUser | null;
  
  balance: number;
  setBalance: React.Dispatch<React.SetStateAction<number>>;
  
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  
  limits: Limit[];
  setLimits: React.Dispatch<React.SetStateAction<Limit[]>>;
  
  goals: Goal[];
  setGoals: React.Dispatch<React.SetStateAction<Goal[]>>;
  
  categories: typeof DEFAULT_CATEGORIES;
  setCategories: React.Dispatch<React.SetStateAction<typeof DEFAULT_CATEGORIES>>;
  
  allCats: { expense: Category[]; income: Category[]; debt: Category[] };
  getCat: (id: string) => Category;
  catLabel: (cat: Category) => string;
  
  dataMode: string;
  setDataMode: (mode: string) => void;
  useRemote: boolean;
  remoteOk: boolean;
  
  activeScreen: ScreenType;
  setActiveScreen: (screen: ScreenType) => void;
  
  showToast: (msg: string, ok?: boolean) => void;
  
  // Derived data
  todayExp: number;
  todayInc: number;
  weekSpend: number;
  monthSpend: number;
  topCats: Array<{ categoryId: string; spent: number; cat: Category }>;
  monthSpentByCategory: (categoryId: string) => number;
  
  // CRUD
  addTransaction: (tx: Omit<Transaction, "id">) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => Promise<void>;
  
  addLimit: (limit: Omit<Limit, "id">) => void;
  updateLimit: (id: string, updates: Partial<Limit>) => void;
  deleteLimit: (id: string) => void;
  
  addGoal: (goal: Omit<Goal, "id">) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  depositToGoal: (goalId: string, delta: number) => void;
  
  syncFromRemote: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Language
  const [lang, setLang] = useState<LangKey>(() => safeJSON.get("hamyon_lang", "uz") as LangKey);
  const t = I18N[lang] || I18N.uz;
  
  // User
  const [tgUser, setTgUser] = useState<TelegramUser | null>(null);
  
  // Data mode
  const [remoteOk, setRemoteOk] = useState(false);
  const [dataMode, setDataMode] = useState(() => safeJSON.get("hamyon_dataMode", "auto"));
  
  // Core data
  const [balance, setBalance] = useState(() => safeJSON.get("hamyon_balance", 0));
  const [transactions, setTransactions] = useState<Transaction[]>(() => safeJSON.get("hamyon_transactions", []));
  const [limits, setLimits] = useState<Limit[]>(() => safeJSON.get("hamyon_limits", []));
  const [goals, setGoals] = useState<Goal[]>(() => safeJSON.get("hamyon_goals", []));
  const [categories, setCategories] = useState(() => safeJSON.get("hamyon_categories", DEFAULT_CATEGORIES));
  
  // UI State
  const [activeScreen, setActiveScreen] = useState<ScreenType>("home");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);
  
  // Telegram init
  useEffect(() => {
    let u: TelegramUser | null = null;
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      tg.setHeaderColor("#FAFAFA");
      tg.setBackgroundColor("#FAFAFA");
      if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
      u = tg.initDataUnsafe?.user || null;
    }
    if (!u) {
      u = { id: safeJSON.get("hamyon_uid", Date.now()), first_name: "User" };
      safeJSON.set("hamyon_uid", u.id);
    }
    setTgUser(u);
  }, []);
  
  // Persist to localStorage
  useEffect(() => safeJSON.set("hamyon_lang", lang), [lang]);
  useEffect(() => safeJSON.set("hamyon_dataMode", dataMode), [dataMode]);
  useEffect(() => safeJSON.set("hamyon_balance", balance), [balance]);
  useEffect(() => safeJSON.set("hamyon_transactions", transactions), [transactions]);
  useEffect(() => safeJSON.set("hamyon_limits", limits), [limits]);
  useEffect(() => safeJSON.set("hamyon_goals", goals), [goals]);
  useEffect(() => safeJSON.set("hamyon_categories", categories), [categories]);
  
  // Supabase check
  useEffect(() => {
    (async () => {
      if (!sb.enabled()) {
        setRemoteOk(false);
        return;
      }
      try {
        await sb.req("users?select=id&limit=1");
        setRemoteOk(true);
      } catch {
        setRemoteOk(false);
      }
    })();
  }, []);
  
  const useRemote = useMemo(() => {
    if (dataMode === "local") return false;
    if (dataMode === "remote") return remoteOk && sb.enabled();
    return remoteOk && sb.enabled();
  }, [dataMode, remoteOk]);
  
  // Category helpers
  const allCats = useMemo(() => {
    const c = categories || DEFAULT_CATEGORIES;
    return {
      expense: c.expense || [],
      income: c.income || [],
      debt: c.debt || [],
    };
  }, [categories]);
  
  const getCat = useCallback((id: string): Category => {
    const list = [...allCats.expense, ...allCats.income, ...allCats.debt];
    return list.find((x) => x.id === id) || { id, uz: id, ru: id, en: id, emoji: "❓", color: "#868E96" };
  }, [allCats]);
  
  const catLabel = useCallback((cat: Category) => (lang === "uz" ? cat.uz : lang === "ru" ? cat.ru : cat.en), [lang]);
  
  // Derived stats
  const today = todayISO();
  const weekStart = startOfWeekISO();
  const month = monthPrefix();
  
  const txToday = useMemo(() => transactions.filter((x) => x.date === today), [transactions, today]);
  const txWeek = useMemo(() => transactions.filter((x) => x.date >= weekStart), [transactions, weekStart]);
  const txMonth = useMemo(() => transactions.filter((x) => x.date.startsWith(month)), [transactions, month]);
  
  const todayExp = useMemo(() => txToday.filter((x) => x.amount < 0).reduce((s, x) => s + Math.abs(x.amount), 0), [txToday]);
  const todayInc = useMemo(() => txToday.filter((x) => x.amount > 0).reduce((s, x) => s + x.amount, 0), [txToday]);
  const weekSpend = useMemo(() => txWeek.filter((x) => x.amount < 0).reduce((s, x) => s + Math.abs(x.amount), 0), [txWeek]);
  const monthSpend = useMemo(() => txMonth.filter((x) => x.amount < 0).reduce((s, x) => s + Math.abs(x.amount), 0), [txMonth]);
  
  const topCats = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of txMonth) {
      if (x.amount >= 0) continue;
      m.set(x.categoryId, (m.get(x.categoryId) || 0) + Math.abs(x.amount));
    }
    return [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([categoryId, spent]) => ({ categoryId, spent, cat: getCat(categoryId) }));
  }, [txMonth, getCat]);
  
  const monthSpentByCategory = useCallback((categoryId: string) => {
    return txMonth
      .filter((x) => x.categoryId === categoryId && x.amount < 0)
      .reduce((s, x) => s + Math.abs(x.amount), 0);
  }, [txMonth]);
  
  // CRUD: Transactions
  const addTransaction = useCallback(async (txData: Omit<Transaction, "id">) => {
    const tx: Transaction = { ...txData, id: uid() };
    setTransactions((prev) => [tx, ...prev]);
    setBalance((b) => b + tx.amount);
    showToast("✓", true);
  }, [showToast]);
  
  const updateTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
    setTransactions((prev) => {
      const old = prev.find((x) => x.id === id);
      if (!old) return prev;
      const newAmount = updates.amount ?? old.amount;
      const delta = newAmount - old.amount;
      if (delta !== 0) setBalance((b) => b + delta);
      return prev.map((x) => (x.id === id ? { ...x, ...updates } : x));
    });
    showToast("✓", true);
  }, [showToast]);
  
  const deleteTransaction = useCallback(async (id: string) => {
    const tx = transactions.find((x) => x.id === id);
    if (tx) {
      setTransactions((prev) => prev.filter((x) => x.id !== id));
      setBalance((b) => b - tx.amount);
      showToast("✓", true);
    }
  }, [transactions, showToast]);
  
  // CRUD: Limits
  const addLimit = useCallback((limitData: Omit<Limit, "id">) => {
    setLimits((prev) => [{ ...limitData, id: uid() }, ...prev]);
    showToast("✓", true);
  }, [showToast]);
  
  const updateLimit = useCallback((id: string, updates: Partial<Limit>) => {
    setLimits((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
    showToast("✓", true);
  }, [showToast]);
  
  const deleteLimit = useCallback((id: string) => {
    setLimits((prev) => prev.filter((l) => l.id !== id));
    showToast("✓", true);
  }, [showToast]);
  
  // CRUD: Goals
  const addGoal = useCallback((goalData: Omit<Goal, "id">) => {
    setGoals((prev) => [{ ...goalData, id: uid() }, ...prev]);
    showToast("✓", true);
  }, [showToast]);
  
  const updateGoal = useCallback((id: string, updates: Partial<Goal>) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));
    showToast("✓", true);
  }, [showToast]);
  
  const deleteGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    showToast("✓", true);
  }, [showToast]);
  
  const depositToGoal = useCallback((goalId: string, delta: number) => {
    if (!delta) return;
    setGoals((prev) => prev.map((g) => (g.id === goalId ? { ...g, current: clamp((g.current || 0) + delta, 0, g.target || 0) } : g)));
    showToast("✓", true);
  }, [showToast]);
  
  // Sync
  const syncFromRemote = useCallback(async () => {
    if (!tgUser?.id || !useRemote) {
      showToast(t.syncFail, false);
      return;
    }
    try {
      const users = await sb.req(`users?telegram_id=eq.${tgUser.id}&select=*`);
      let u = users?.[0] || null;
      if (!u) {
        const created = await sb.req("users", {
          method: "POST",
          body: { telegram_id: tgUser.id, name: tgUser.first_name || "User", balance: 0 },
        });
        u = created?.[0] || null;
      }
      
      const [tx, lim, gl] = await Promise.all([
        sb.req(`transactions?user_telegram_id=eq.${tgUser.id}&select=*&order=created_at.desc&limit=200`),
        sb.req(`limits?user_telegram_id=eq.${tgUser.id}&select=*`),
        sb.req(`goals?user_telegram_id=eq.${tgUser.id}&select=*`),
      ]);
      
      const txLocal = (tx || []).map((r: any) => ({
        id: r.id,
        type: r.amount < 0 ? "expense" : "income",
        amount: Number(r.amount),
        description: r.description || "",
        categoryId: r.category_id || "other",
        date: (r.created_at || new Date().toISOString()).slice(0, 10),
        time: (r.created_at || new Date().toISOString()).slice(11, 16),
        source: r.source || "app",
        remote: true,
      }));
      
      const limLocal = (lim || []).map((r: any) => ({
        id: r.id,
        categoryId: r.category_id,
        amount: Number(r.limit_amount || 0),
        remote: true,
      }));
      
      const goalsLocal = (gl || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        target: Number(r.target_amount || 0),
        current: Number(r.current_amount || 0),
        emoji: r.emoji || "🎯",
        remote: true,
      }));
      
      setBalance(Number(u?.balance || 0));
      setTransactions(txLocal);
      setLimits(limLocal);
      setGoals(goalsLocal);
      showToast(t.syncOk, true);
    } catch (e) {
      console.error(e);
      showToast(t.syncFail, false);
    }
  }, [tgUser, useRemote, t, showToast]);
  
  const value: AppState = {
    lang, t, setLang,
    tgUser,
    balance, setBalance,
    transactions, setTransactions,
    limits, setLimits,
    goals, setGoals,
    categories, setCategories,
    allCats, getCat, catLabel,
    dataMode, setDataMode, useRemote, remoteOk,
    activeScreen, setActiveScreen,
    showToast,
    todayExp, todayInc, weekSpend, monthSpend, topCats, monthSpentByCategory,
    addTransaction, updateTransaction, deleteTransaction,
    addLimit, updateLimit, deleteLimit,
    addGoal, updateGoal, deleteGoal, depositToGoal,
    syncFromRemote,
  };
  
  return (
    <AppContext.Provider value={value}>
      {children}
      
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 inset-x-4 z-[200] flex justify-center animate-fade-in">
          <div className={`px-6 py-3 rounded-2xl font-semibold flex items-center gap-2 shadow-elevated ${toast.ok ? 'bg-success text-white' : 'bg-destructive text-white'}`}>
            <span>{toast.ok ? "✓" : "!"}</span>
            <span>{toast.msg}</span>
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
};

// Telegram types for window
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        disableVerticalSwipes?: () => void;
        disableHorizontalSwipes?: () => void;
        initDataUnsafe?: { user?: TelegramUser };
        openTelegramLink?: (url: string) => void;
      };
    };
  }
}
