import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, ReactNode } from "react";
import { I18N, DEFAULT_CATEGORIES, LangKey, Translation, Category } from "@/lib/constants";
import { safeJSON, uid, todayISO, startOfWeekISO, monthPrefix, clamp, sb } from "@/lib/storage";
import { Transaction, Limit, Goal, TelegramUser, ScreenType, QuickAddPreset } from "@/types";
import { supabase } from "@/integrations/supabase/client";

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
  todayExp: number;
  todayInc: number;
  weekSpend: number;
  monthSpend: number;
  topCats: Array<{ categoryId: string; spent: number; cat: Category }>;
  monthSpentByCategory: (categoryId: string) => number;
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
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
  currency: string;
  setCurrency: (currency: string) => void;
  quickAdds: QuickAddPreset[];
  setQuickAdds: (presets: QuickAddPreset[]) => void;
  onboardingComplete: boolean;
  setOnboardingComplete: (complete: boolean) => void;
  reminderDays: number;
  setReminderDays: (days: number) => void;
  syncFromRemote: () => Promise<void>;
  syncTelegramTransactions: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<LangKey>(() => safeJSON.get("hamyon_lang", "uz") as LangKey);
  const t = I18N[lang] || I18N.uz;
  
  const [tgUser, setTgUser] = useState<TelegramUser | null>(null);
  const [remoteOk, setRemoteOk] = useState(false);
  const [dataMode, setDataMode] = useState(() => safeJSON.get("hamyon_dataMode", "auto"));
  
  const [balance, setBalance] = useState(() => safeJSON.get("hamyon_balance", 0));
  const [transactions, setTransactions] = useState<Transaction[]>(() => safeJSON.get("hamyon_transactions", []));
  const [limits, setLimits] = useState<Limit[]>(() => safeJSON.get("hamyon_limits", []));
  const [goals, setGoals] = useState<Goal[]>(() => safeJSON.get("hamyon_goals", []));
  const [categories, setCategories] = useState(() => safeJSON.get("hamyon_categories", DEFAULT_CATEGORIES));
  
  const [theme, setThemeState] = useState<"light" | "dark" | "system">(() => safeJSON.get("hamyon_theme", "light") as "light" | "dark" | "system");
  const [currency, setCurrencyState] = useState<string>(() => safeJSON.get("hamyon_currency", "UZS"));
  const [quickAdds, setQuickAddsState] = useState<QuickAddPreset[]>(() => safeJSON.get("hamyon_quickAdds", []));
  const [onboardingComplete, setOnboardingCompleteState] = useState(() => Boolean(safeJSON.get("hamyon_onboarding", false)));
  const [reminderDays, setReminderDaysState] = useState<number>(() => safeJSON.get("hamyon_reminderDays", 3));
  
  const setTheme = useCallback((newTheme: "light" | "dark" | "system") => {
    setThemeState(newTheme);
    safeJSON.set("hamyon_theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  }, []);
  
  const setCurrency = useCallback((newCurrency: string) => {
    setCurrencyState(newCurrency);
    safeJSON.set("hamyon_currency", newCurrency);
  }, []);
  
  const setQuickAdds = useCallback((presets: QuickAddPreset[]) => {
    setQuickAddsState(presets);
    safeJSON.set("hamyon_quickAdds", presets);
  }, []);
  
  const setOnboardingComplete = useCallback((complete: boolean) => {
    setOnboardingCompleteState(complete);
    safeJSON.set("hamyon_onboarding", complete);
  }, []);
  
  const setReminderDays = useCallback((days: number) => {
    setReminderDaysState(days);
    safeJSON.set("hamyon_reminderDays", days);
  }, []);
  
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, []);
  
  const [activeScreen, setActiveScreen] = useState<ScreenType>("home");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);
  
  useEffect(() => {
    let u: TelegramUser | null = null;
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      tg.setHeaderColor("#FAFAFA");
      tg.setBackgroundColor("#FAFAFA");
      // NOTE: do NOT disable vertical swipes; it breaks scrolling in many screens/modals.
      u = tg.initDataUnsafe?.user || null;
    }
    if (!u) {
      u = { id: safeJSON.get("hamyon_uid", Date.now()), first_name: "User" };
      safeJSON.set("hamyon_uid", u.id);
    }
    setTgUser(u);
  }, []);
  
  useEffect(() => safeJSON.set("hamyon_lang", lang), [lang]);
  useEffect(() => safeJSON.set("hamyon_dataMode", dataMode), [dataMode]);
  useEffect(() => safeJSON.set("hamyon_balance", balance), [balance]);
  useEffect(() => safeJSON.set("hamyon_transactions", transactions), [transactions]);
  useEffect(() => safeJSON.set("hamyon_limits", limits), [limits]);
  useEffect(() => safeJSON.set("hamyon_goals", goals), [goals]);
  useEffect(() => safeJSON.set("hamyon_categories", categories), [categories]);
  
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
  
  const today = todayISO();
  const weekStart = startOfWeekISO();
  const month = today.slice(0, 7);
  
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

  // Sync transactions from Telegram bot
  const syncTelegramTransactions = useCallback(async () => {
    if (!tgUser?.id) {
      showToast(t.syncFail, false);
      return;
    }
    
    try {
      // Fetch unsynced transactions from telegram_transactions table
      const { data: telegramTx, error } = await supabase
        .from('telegram_transactions')
        .select('*')
        .eq('telegram_user_id', tgUser.id)
        .eq('synced', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching telegram transactions:', error);
        showToast(t.syncFail, false);
        return;
      }

      if (!telegramTx || telegramTx.length === 0) {
        showToast(lang === 'ru' ? 'Нет новых транзакций' : lang === 'uz' ? 'Yangi tranzaksiyalar yo\'q' : 'No new transactions', true);
        return;
      }

      // Convert and add to local transactions
      const newTransactions: Transaction[] = telegramTx.map((tx: any) => ({
        id: tx.id,
        type: tx.type as 'expense' | 'income',
        amount: Number(tx.amount),
        description: tx.description || '',
        categoryId: tx.category_id,
        date: tx.created_at.slice(0, 10),
        time: tx.created_at.slice(11, 16),
        source: 'telegram',
      }));

      // Merge with existing transactions (avoid duplicates)
      setTransactions(prev => {
        const existingIds = new Set(prev.map(t => t.id));
        const uniqueNew = newTransactions.filter(t => !existingIds.has(t.id));
        const merged = [...uniqueNew, ...prev];
        safeJSON.set("hamyon_transactions", merged);
        return merged;
      });

      // Update balance
      const balanceChange = newTransactions.reduce((sum, tx) => sum + tx.amount, 0);
      setBalance(prev => {
        const newBalance = prev + balanceChange;
        safeJSON.set("hamyon_balance", newBalance);
        return newBalance;
      });

      // Mark as synced in database
      const syncedIds = telegramTx.map((tx: any) => tx.id);
      await supabase
        .from('telegram_transactions')
        .update({ synced: true })
        .in('id', syncedIds);

      showToast(
        lang === 'ru' ? `Синхронизировано: ${telegramTx.length}` : 
        lang === 'uz' ? `Sinxronlandi: ${telegramTx.length}` : 
        `Synced: ${telegramTx.length}`, 
        true
      );
    } catch (e) {
      console.error('Sync error:', e);
      showToast(t.syncFail, false);
    }
  }, [tgUser, lang, t, showToast, setTransactions, setBalance]);
  
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
    theme, setTheme, currency, setCurrency, quickAdds, setQuickAdds, onboardingComplete, setOnboardingComplete,
    reminderDays, setReminderDays, syncFromRemote, syncTelegramTransactions,
  };
  
  return (
    <AppContext.Provider value={value}>
      {children}
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
