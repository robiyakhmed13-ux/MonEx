import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Transaction, Limit, Goal } from '@/types';
import { useAuth } from './useAuth';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  telegram_id: number | null;
  telegram_username: string | null;
}

export function useSupabaseData() {
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [limits, setLimits] = useState<Limit[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch user profile
  const fetchProfile = useCallback(async () => {
    if (!user?.id) return null;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    
    return data as Profile | null;
  }, [user?.id]);

  // Fetch all user data
  const fetchAllData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    try {
      const [profileData, txData, limitsData, goalsData] = await Promise.all([
        fetchProfile(),
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(500),
        supabase
          .from('limits')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('goals')
          .select('*')
          .eq('user_id', user.id),
      ]);

      setProfile(profileData);

      // Map transactions
      if (txData.data) {
        setTransactions(txData.data.map((tx: any) => ({
          id: tx.id,
          type: tx.type as 'expense' | 'income',
          amount: Number(tx.amount),
          description: tx.description || '',
          categoryId: tx.category_id,
          date: tx.date,
          source: tx.source || 'app',
        })));
      }

      // Map limits
      if (limitsData.data) {
        setLimits(limitsData.data.map((l: any) => ({
          id: l.id,
          categoryId: l.category_id,
          amount: Number(l.amount),
        })));
      }

      // Map goals
      if (goalsData.data) {
        setGoals(goalsData.data.map((g: any) => ({
          id: g.id,
          name: g.name,
          target: Number(g.target),
          current: Number(g.current || 0),
          emoji: '🎯',
          deadline: g.deadline,
        })));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, fetchProfile]);

  // Initial data fetch
  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, fetchAllData]);

  // Add transaction
  const addTransaction = useCallback(async (tx: Omit<Transaction, 'id'>) => {
    if (!user?.id) return null;

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: tx.type,
        amount: tx.amount,
        category_id: tx.categoryId,
        description: tx.description,
        date: tx.date,
        source: tx.source || 'app',
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding transaction:', error);
      return null;
    }

    const newTx: Transaction = {
      id: data.id,
      type: data.type as 'expense' | 'income',
      amount: Number(data.amount),
      description: data.description || '',
      categoryId: data.category_id,
      date: data.date,
      source: data.source || 'app',
    };

    setTransactions(prev => [newTx, ...prev]);
    return newTx;
  }, [user?.id]);

  // Update transaction
  const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    if (!user?.id) return false;

    const dbUpdates: any = {};
    if (updates.type) dbUpdates.type = updates.type;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.categoryId) dbUpdates.category_id = updates.categoryId;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.date) dbUpdates.date = updates.date;

    const { error } = await supabase
      .from('transactions')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating transaction:', error);
      return false;
    }

    setTransactions(prev => prev.map(tx => tx.id === id ? { ...tx, ...updates } : tx));
    return true;
  }, [user?.id]);

  // Delete transaction
  const deleteTransaction = useCallback(async (id: string) => {
    if (!user?.id) return false;

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting transaction:', error);
      return false;
    }

    setTransactions(prev => prev.filter(tx => tx.id !== id));
    return true;
  }, [user?.id]);

  // Add limit
  const addLimit = useCallback(async (limit: Omit<Limit, 'id'>) => {
    if (!user?.id) return null;

    const { data, error } = await supabase
      .from('limits')
      .insert({
        user_id: user.id,
        category_id: limit.categoryId,
        amount: limit.amount,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding limit:', error);
      return null;
    }

    const newLimit: Limit = {
      id: data.id,
      categoryId: data.category_id,
      amount: Number(data.amount),
    };

    setLimits(prev => [newLimit, ...prev]);
    return newLimit;
  }, [user?.id]);

  // Update limit
  const updateLimit = useCallback(async (id: string, updates: Partial<Limit>) => {
    if (!user?.id) return false;

    const dbUpdates: any = {};
    if (updates.categoryId) dbUpdates.category_id = updates.categoryId;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;

    const { error } = await supabase
      .from('limits')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating limit:', error);
      return false;
    }

    setLimits(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    return true;
  }, [user?.id]);

  // Delete limit
  const deleteLimit = useCallback(async (id: string) => {
    if (!user?.id) return false;

    const { error } = await supabase
      .from('limits')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting limit:', error);
      return false;
    }

    setLimits(prev => prev.filter(l => l.id !== id));
    return true;
  }, [user?.id]);

  // Add goal
  const addGoal = useCallback(async (goal: Omit<Goal, 'id'>) => {
    if (!user?.id) return null;

    const { data, error } = await supabase
      .from('goals')
      .insert({
        user_id: user.id,
        name: goal.name,
        target: goal.target,
        current: goal.current || 0,
        deadline: goal.deadline,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding goal:', error);
      return null;
    }

    const newGoal: Goal = {
      id: data.id,
      name: data.name,
      target: Number(data.target),
      current: Number(data.current || 0),
      emoji: goal.emoji || '🎯',
      deadline: data.deadline,
    };

    setGoals(prev => [newGoal, ...prev]);
    return newGoal;
  }, [user?.id]);

  // Update goal
  const updateGoal = useCallback(async (id: string, updates: Partial<Goal>) => {
    if (!user?.id) return false;

    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.target !== undefined) dbUpdates.target = updates.target;
    if (updates.current !== undefined) dbUpdates.current = updates.current;
    if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline;

    const { error } = await supabase
      .from('goals')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating goal:', error);
      return false;
    }

    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
    return true;
  }, [user?.id]);

  // Delete goal
  const deleteGoal = useCallback(async (id: string) => {
    if (!user?.id) return false;

    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting goal:', error);
      return false;
    }

    setGoals(prev => prev.filter(g => g.id !== id));
    return true;
  }, [user?.id]);

  // Deposit to goal
  const depositToGoal = useCallback(async (goalId: string, delta: number) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return false;

    const newCurrent = Math.max(0, Math.min((goal.current || 0) + delta, goal.target));
    return updateGoal(goalId, { current: newCurrent });
  }, [goals, updateGoal]);

  // Sync telegram transactions
  const syncTelegramTransactions = useCallback(async () => {
    if (!user?.id || !profile?.telegram_id) return 0;

    // Call the sync function
    const { data, error } = await supabase.rpc('sync_telegram_transactions', {
      p_user_id: user.id
    });

    if (error) {
      console.error('Error syncing telegram transactions:', error);
      return 0;
    }

    // Refresh transactions
    await fetchAllData();
    
    return data?.[0]?.synced_count || 0;
  }, [user?.id, profile?.telegram_id, fetchAllData]);

  // Link telegram account
  const linkTelegramAccount = useCallback(async (telegramId: number, telegramUsername?: string) => {
    if (!user?.id) return false;

    const { data, error } = await supabase.rpc('link_telegram_account', {
      p_user_id: user.id,
      p_telegram_id: telegramId,
      p_telegram_username: telegramUsername || null
    });

    if (error) {
      console.error('Error linking telegram:', error);
      return false;
    }

    // Refresh profile
    const newProfile = await fetchProfile();
    setProfile(newProfile);

    return data;
  }, [user?.id, fetchProfile]);

  return {
    profile,
    transactions,
    limits,
    goals,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addLimit,
    updateLimit,
    deleteLimit,
    addGoal,
    updateGoal,
    deleteGoal,
    depositToGoal,
    syncTelegramTransactions,
    linkTelegramAccount,
    refetch: fetchAllData,
  };
}

export default useSupabaseData;
