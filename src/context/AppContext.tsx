import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, ReactNode } from "react";
import { User, Session } from '@supabase/supabase-js';
import { I18N, DEFAULT_CATEGORIES, LangKey, Translation, Category } from "@/lib/constants";
import { safeJSON, uid, todayISO, startOfWeekISO, clamp } from "@/lib/storage";
import { Transaction, Limit, Goal, TelegramUser, ScreenType, QuickAddPreset } from "@/types";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  telegram_id: number | null;
  telegram_username: string | null;
  language?: string | null;
}

interface AppState {
  // Auth
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  authLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  
  // App state
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
  linkTelegramAccount: (telegramId: number, username?: string) => Promise<boolean>;
}

const AppContext = createContext<AppState | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Initialize auth
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setAuthLoading(false);
        
        // Fetch profile after auth state change
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setAuthLoading(false);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (!error && data) {
      setProfile(data as Profile);
    }
  };

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { full_name: fullName || '' }
        }
      });
      return { error: error as Error | null };
    } catch (err) {
      return { error: err as Error };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error as Error | null };
    } catch (err) {
      return { error: err as Error };
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  }, []);

  const isAuthenticated = !!session;

  // Helper function to detect language from various sources
  const detectLanguage = (): LangKey => {
    // 1. Check localStorage first
    const saved = safeJSON.get("monex_lang", null);
    if (saved && (saved === 'en' || saved === 'ru' || saved === 'uz')) {
      return saved as LangKey;
    }
    
    // 2. Check Telegram WebApp language if available
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (tgUser && 'language_code' in tgUser && tgUser.language_code) {
      const tgLang = String(tgUser.language_code).toLowerCase();
      if (tgLang.startsWith('uz')) return 'uz';
      if (tgLang.startsWith('ru')) return 'ru';
    }
    
    // 3. Fall back to navigator.language
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('uz')) return 'uz';
    if (browserLang.startsWith('ru')) return 'ru';
    
    // 4. Default to English
    return 'en';
  };

  // App state
  const [lang, setLangState] = useState<LangKey>(detectLanguage);
  const t = I18N[lang] || I18N.en;
  
  // Wrapper for setLang that also persists and syncs
  const setLang = useCallback((newLang: LangKey) => {
    setLangState(newLang);
    safeJSON.set("monex_lang", newLang);
    
    // Sync to Supabase profile (non-blocking, don't wait)
    if (isAuthenticated && user?.id) {
      (async () => {
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ language: newLang } as any)
            .eq('id', user.id);
          if (error) {
            console.warn('Failed to sync language to profile:', error);
          }
        } catch (err: any) {
          console.warn('Error syncing language:', err);
        }
      })();
    }
  }, [isAuthenticated, user?.id]);
  
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
  
  // Telegram WebApp init
  useEffect(() => {
    let u: TelegramUser | null = null;
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      tg.setHeaderColor("#FAFAFA");
      tg.setBackgroundColor("#FAFAFA");
      u = tg.initDataUnsafe?.user || null;
    }
    if (!u) {
      u = { id: safeJSON.get("hamyon_uid", Date.now()), first_name: "User" };
      safeJSON.set("hamyon_uid", u.id);
    }
    setTgUser(u);
  }, []);
  
  // Sync language from profile when profile loads (non-blocking, only if no localStorage preference)
  useEffect(() => {
    if (profile?.language && (profile.language === 'en' || profile.language === 'ru' || profile.language === 'uz')) {
      const savedLang = safeJSON.get("monex_lang", null);
      // Only use profile language if user hasn't explicitly set one in localStorage
      if (!savedLang && lang !== profile.language) {
        setLangState(profile.language as LangKey);
        safeJSON.set("monex_lang", profile.language);
      }
    }
  }, [profile?.language]); // Only run when profile language changes

  // Persist to localStorage
  useEffect(() => safeJSON.set("hamyon_dataMode", dataMode), [dataMode]);
  useEffect(() => safeJSON.set("hamyon_balance", balance), [balance]);
  useEffect(() => safeJSON.set("hamyon_transactions", transactions), [transactions]);
  useEffect(() => safeJSON.set("hamyon_limits", limits), [limits]);
  useEffect(() => safeJSON.set("hamyon_goals", goals), [goals]);
  useEffect(() => safeJSON.set("hamyon_categories", categories), [categories]);
  
  // Fetch data from Supabase when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    
    const fetchData = async () => {
      try {
        const [txResult, limResult, goalResult] = await Promise.all([
          supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(500),
          supabase.from('limits').select('*').eq('user_id', user.id),
          supabase.from('goals').select('*').eq('user_id', user.id),
        ]);

        if (txResult.data && txResult.data.length > 0) {
          const mappedTx = txResult.data.map((tx: any) => ({
            id: tx.id,
            type: tx.type as 'expense' | 'income',
            amount: Number(tx.amount),
            description: tx.description || '',
            categoryId: tx.category_id,
            date: tx.date,
            source: tx.source || 'app',
          }));
          setTransactions(mappedTx);
          setBalance(mappedTx.reduce((sum, tx) => sum + tx.amount, 0));
        }

        if (limResult.data) {
          setLimits(limResult.data.map((l: any) => ({
            id: l.id,
            categoryId: l.category_id,
            amount: Number(l.amount),
          })));
        }

        if (goalResult.data) {
          setGoals(goalResult.data.map((g: any) => ({
            id: g.id,
            name: g.name,
            target: Number(g.target),
            current: Number(g.current || 0),
            emoji: '🎯',
            deadline: g.deadline,
          })));
        }
        
        setRemoteOk(true);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [isAuthenticated, user?.id]);

  // Real-time sync for transactions (including Telegram-added ones)
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const channel = supabase
      .channel('transactions-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Real-time: Transaction added', payload);
          const tx = payload.new as any;
          const newTransaction: Transaction = {
            id: tx.id,
            type: tx.type as 'expense' | 'income',
            amount: Number(tx.amount),
            description: tx.description || '',
            categoryId: tx.category_id,
            date: tx.date,
            source: tx.source || 'telegram',
          };
          
          setTransactions(prev => {
            // Check if already exists
            if (prev.some(t => t.id === tx.id)) return prev;
            return [newTransaction, ...prev];
          });
          setBalance(prev => prev + newTransaction.amount);
          
          // Show toast for Telegram-sourced transactions
          if (tx.source === 'telegram') {
            showToast(`📱 Telegram: ${tx.description || tx.category_id} - ${Math.abs(tx.amount).toLocaleString()}`, true);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Real-time: Transaction updated', payload);
          const tx = payload.new as any;
          setTransactions(prev => prev.map(t => 
            t.id === tx.id 
              ? {
                  id: tx.id,
                  type: tx.type as 'expense' | 'income',
                  amount: Number(tx.amount),
                  description: tx.description || '',
                  categoryId: tx.category_id,
                  date: tx.date,
                  source: tx.source || 'app',
                }
              : t
          ));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Real-time: Transaction deleted', payload);
          const oldTx = payload.old as any;
          setTransactions(prev => prev.filter(t => t.id !== oldTx.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, user?.id, showToast]);
  
  const useRemote = useMemo(() => {
    if (!isAuthenticated) return false;
    if (dataMode === "local") return false;
    return remoteOk;
  }, [dataMode, remoteOk, isAuthenticated]);
  
  const allCats = useMemo(() => {
    const c = categories || DEFAULT_CATEGORIES;
    return { expense: c.expense || [], income: c.income || [], debt: c.debt || [] };
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
  
  // Transaction operations
  const addTransaction = useCallback(async (txData: Omit<Transaction, "id">) => {
    let tx: Transaction;
    
    if (isAuthenticated && user?.id) {
      // Save to Supabase
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: txData.type,
          amount: txData.amount,
          category_id: txData.categoryId,
          description: txData.description,
          date: txData.date,
          source: txData.source || 'app',
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding transaction:', error);
        showToast(t.syncFail || 'Error', false);
        return;
      }

      tx = {
        id: data.id,
        type: data.type as 'expense' | 'income',
        amount: Number(data.amount),
        description: data.description || '',
        categoryId: data.category_id,
        date: data.date,
        source: data.source || 'app',
      };

      setTransactions((prev) => [tx, ...prev]);
      setBalance((b) => b + tx.amount);

      // Check triggers and send push notifications (non-blocking)
      if (tx.type === 'expense' && tx.amount < 0) {
        import('@/lib/pushTriggers').then(async ({ checkTransactionTriggers, sendPushNotificationForTrigger }) => {
          const updatedTransactions = [tx, ...transactions];
          const triggers = await checkTransactionTriggers(
            tx,
            user.id,
            updatedTransactions,
            limits,
            goals,
            balance + tx.amount
          );
          
          for (const trigger of triggers) {
            await sendPushNotificationForTrigger(user.id, trigger);
          }
        }).catch(err => console.error('Error checking triggers:', err));
      }
    } else {
      // Local only
      tx = { ...txData, id: uid() };
      setTransactions((prev) => [tx, ...prev]);
      setBalance((b) => b + tx.amount);
    }
    showToast("✓", true);
  }, [isAuthenticated, user?.id, showToast, t, transactions, limits, goals, balance]);
  
  const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    if (isAuthenticated && user?.id) {
      const dbUpdates: any = {};
      if (updates.type) dbUpdates.type = updates.type;
      if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
      if (updates.categoryId) dbUpdates.category_id = updates.categoryId;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.date) dbUpdates.date = updates.date;

      await supabase.from('transactions').update(dbUpdates).eq('id', id).eq('user_id', user.id);
    }

    setTransactions((prev) => {
      const old = prev.find((x) => x.id === id);
      if (!old) return prev;
      const newAmount = updates.amount ?? old.amount;
      const delta = newAmount - old.amount;
      if (delta !== 0) setBalance((b) => b + delta);
      return prev.map((x) => (x.id === id ? { ...x, ...updates } : x));
    });
    showToast("✓", true);
  }, [isAuthenticated, user?.id, showToast]);
  
  const deleteTransaction = useCallback(async (id: string) => {
    const tx = transactions.find((x) => x.id === id);
    if (tx) {
      if (isAuthenticated && user?.id) {
        await supabase.from('transactions').delete().eq('id', id).eq('user_id', user.id);
      }
      setTransactions((prev) => prev.filter((x) => x.id !== id));
      setBalance((b) => b - tx.amount);
      showToast("✓", true);
    }
  }, [transactions, isAuthenticated, user?.id, showToast]);
  
  // Limit operations
  const addLimit = useCallback(async (limitData: Omit<Limit, "id">) => {
    if (isAuthenticated && user?.id) {
      const { data, error } = await supabase
        .from('limits')
        .insert({
          user_id: user.id,
          category_id: limitData.categoryId,
          amount: limitData.amount,
        })
        .select()
        .single();

      if (!error && data) {
        setLimits((prev) => [{ id: data.id, categoryId: data.category_id, amount: Number(data.amount) }, ...prev]);
      }
    } else {
      setLimits((prev) => [{ ...limitData, id: uid() }, ...prev]);
    }
    showToast("✓", true);
  }, [isAuthenticated, user?.id, showToast]);
  
  const updateLimit = useCallback(async (id: string, updates: Partial<Limit>) => {
    if (isAuthenticated && user?.id) {
      const dbUpdates: any = {};
      if (updates.categoryId) dbUpdates.category_id = updates.categoryId;
      if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
      await supabase.from('limits').update(dbUpdates).eq('id', id).eq('user_id', user.id);
    }
    setLimits((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
    showToast("✓", true);
  }, [isAuthenticated, user?.id, showToast]);
  
  const deleteLimit = useCallback(async (id: string) => {
    if (isAuthenticated && user?.id) {
      await supabase.from('limits').delete().eq('id', id).eq('user_id', user.id);
    }
    setLimits((prev) => prev.filter((l) => l.id !== id));
    showToast("✓", true);
  }, [isAuthenticated, user?.id, showToast]);
  
  // Goal operations
  const addGoal = useCallback(async (goalData: Omit<Goal, "id">) => {
    if (isAuthenticated && user?.id) {
      const { data, error } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          name: goalData.name,
          target: goalData.target,
          current: goalData.current || 0,
          deadline: goalData.deadline,
        })
        .select()
        .single();

      if (!error && data) {
        setGoals((prev) => [{
          id: data.id,
          name: data.name,
          target: Number(data.target),
          current: Number(data.current || 0),
          emoji: goalData.emoji || '🎯',
          deadline: data.deadline,
        }, ...prev]);
      }
    } else {
      setGoals((prev) => [{ ...goalData, id: uid() }, ...prev]);
    }
    showToast("✓", true);
  }, [isAuthenticated, user?.id, showToast]);
  
  const updateGoal = useCallback(async (id: string, updates: Partial<Goal>) => {
    if (isAuthenticated && user?.id) {
      const dbUpdates: any = {};
      if (updates.name) dbUpdates.name = updates.name;
      if (updates.target !== undefined) dbUpdates.target = updates.target;
      if (updates.current !== undefined) dbUpdates.current = updates.current;
      if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline;
      await supabase.from('goals').update(dbUpdates).eq('id', id).eq('user_id', user.id);
    }
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));
    showToast("✓", true);
  }, [isAuthenticated, user?.id, showToast]);
  
  const deleteGoal = useCallback(async (id: string) => {
    if (isAuthenticated && user?.id) {
      await supabase.from('goals').delete().eq('id', id).eq('user_id', user.id);
    }
    setGoals((prev) => prev.filter((g) => g.id !== id));
    showToast("✓", true);
  }, [isAuthenticated, user?.id, showToast]);
  
  const depositToGoal = useCallback((goalId: string, delta: number) => {
    if (!delta) return;
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
      const newCurrent = clamp((goal.current || 0) + delta, 0, goal.target || 0);
      updateGoal(goalId, { current: newCurrent });
    }
  }, [goals, updateGoal]);
  
  const syncFromRemote = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      showToast(t.syncFail, false);
      return;
    }
    
    try {
      const [txResult, limResult, goalResult] = await Promise.all([
        supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(500),
        supabase.from('limits').select('*').eq('user_id', user.id),
        supabase.from('goals').select('*').eq('user_id', user.id),
      ]);

      if (txResult.data) {
        const mappedTx = txResult.data.map((tx: any) => ({
          id: tx.id,
          type: tx.type as 'expense' | 'income',
          amount: Number(tx.amount),
          description: tx.description || '',
          categoryId: tx.category_id,
          date: tx.date,
          source: tx.source || 'app',
        }));
        setTransactions(mappedTx);
        setBalance(mappedTx.reduce((sum, tx) => sum + tx.amount, 0));
      }

      if (limResult.data) {
        setLimits(limResult.data.map((l: any) => ({
          id: l.id,
          categoryId: l.category_id,
          amount: Number(l.amount),
        })));
      }

      if (goalResult.data) {
        setGoals(goalResult.data.map((g: any) => ({
          id: g.id,
          name: g.name,
          target: Number(g.target),
          current: Number(g.current || 0),
          emoji: '🎯',
          deadline: g.deadline,
        })));
      }

      showToast(t.syncOk, true);
    } catch (e) {
      console.error(e);
      showToast(t.syncFail, false);
    }
  }, [isAuthenticated, user?.id, t, showToast]);

  const syncTelegramTransactions = useCallback(async () => {
    if (!isAuthenticated || !user?.id || !profile?.telegram_id) {
      // Try fetching from telegram_transactions for guest users
      if (tgUser?.id) {
        const { data: telegramTx, error } = await supabase
          .from('telegram_transactions')
          .select('*')
          .eq('telegram_user_id', tgUser.id)
          .eq('synced', false)
          .order('created_at', { ascending: false });

        if (!error && telegramTx && telegramTx.length > 0) {
          const newTransactions: Transaction[] = telegramTx.map((tx: any) => ({
            id: tx.id,
            type: tx.type as 'expense' | 'income',
            amount: Number(tx.amount),
            description: tx.description || '',
            categoryId: tx.category_id,
            date: tx.created_at.slice(0, 10),
            source: 'telegram',
          }));

          setTransactions(prev => {
            const existingIds = new Set(prev.map(t => t.id));
            const uniqueNew = newTransactions.filter(t => !existingIds.has(t.id));
            return [...uniqueNew, ...prev];
          });

          const balanceChange = newTransactions.reduce((sum, tx) => sum + tx.amount, 0);
          setBalance(prev => prev + balanceChange);

          await supabase
            .from('telegram_transactions')
            .update({ synced: true })
            .in('id', telegramTx.map((tx: any) => tx.id));

          showToast(`Synced: ${telegramTx.length}`, true);
          return;
        }
      }
      showToast(lang === 'ru' ? 'Нет новых транзакций' : 'No new transactions', true);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('sync_telegram_transactions', { p_user_id: user.id });
      
      if (error) {
        console.error('Sync error:', error);
        showToast(t.syncFail, false);
        return;
      }

      const syncedCount = data?.[0]?.synced_count || 0;
      
      if (syncedCount > 0) {
        await syncFromRemote();
        showToast(`Synced: ${syncedCount}`, true);
      } else {
        showToast(lang === 'ru' ? 'Нет новых транзакций' : 'No new transactions', true);
      }
    } catch (e) {
      console.error('Sync error:', e);
      showToast(t.syncFail, false);
    }
  }, [isAuthenticated, user?.id, profile?.telegram_id, tgUser?.id, lang, t, showToast, syncFromRemote]);

  const linkTelegramAccount = useCallback(async (telegramId: number, username?: string): Promise<boolean> => {
    if (!isAuthenticated || !user?.id) return false;

    try {
      const { data, error } = await supabase.rpc('link_telegram_account', {
        p_user_id: user.id,
        p_telegram_id: telegramId,
        p_telegram_username: username || null
      });

      if (error) {
        console.error('Link error:', error);
        return false;
      }

      // Refresh profile
      await fetchProfile(user.id);
      showToast('Telegram linked!', true);
      return data;
    } catch (e) {
      console.error('Link error:', e);
      return false;
    }
  }, [isAuthenticated, user?.id, showToast]);
  
  const value: AppState = {
    // Auth
    user, session, profile, authLoading, isAuthenticated, signIn, signUp, signOut,
    // App
    lang, t, setLang, tgUser,
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
    reminderDays, setReminderDays, syncFromRemote, syncTelegramTransactions, linkTelegramAccount,
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
