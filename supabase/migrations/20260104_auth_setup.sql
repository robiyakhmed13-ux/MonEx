-- Authentication Setup for MonEX
-- Works with existing telegram_transactions table

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  telegram_id BIGINT UNIQUE,
  telegram_username TEXT,
  pin_hash TEXT,
  biometric_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- ============================================
-- PART 2: ADD USER_ID TO TELEGRAM_TRANSACTIONS
-- ============================================

-- Add user_id column (links to auth.users)
ALTER TABLE public.telegram_transactions 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for user_id
CREATE INDEX IF NOT EXISTS idx_telegram_transactions_user_id 
  ON public.telegram_transactions(user_id);

-- Update RLS policies to include user_id
-- First drop the old public policies
DROP POLICY IF EXISTS "Allow public insert for telegram transactions" ON public.telegram_transactions;
DROP POLICY IF EXISTS "Allow public select for telegram transactions" ON public.telegram_transactions;
DROP POLICY IF EXISTS "Allow public update for telegram transactions" ON public.telegram_transactions;

-- Create new policies that respect user ownership
CREATE POLICY "Users can view own telegram transactions" 
  ON public.telegram_transactions FOR SELECT 
  USING (
    auth.uid() = user_id OR 
    user_id IS NULL OR 
    auth.role() = 'service_role'
  );

CREATE POLICY "Users can insert own telegram transactions" 
  ON public.telegram_transactions FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id OR 
    auth.role() = 'service_role'
  );

CREATE POLICY "Users can update own telegram transactions" 
  ON public.telegram_transactions FOR UPDATE 
  USING (
    auth.uid() = user_id OR 
    user_id IS NULL OR 
    auth.role() = 'service_role'
  );

CREATE POLICY "Public can insert from telegram bot" 
  ON public.telegram_transactions FOR INSERT 
  WITH CHECK (user_id IS NULL);

-- ============================================
-- PART 3: CREATE STANDARD TRANSACTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL,
  category_id TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK (type IN ('expense', 'income')),
  source TEXT DEFAULT 'app',
  telegram_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category_id);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own transactions" 
  ON public.transactions FOR SELECT 
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own transactions" 
  ON public.transactions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" 
  ON public.transactions FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" 
  ON public.transactions FOR DELETE 
  USING (auth.uid() = user_id);

-- ============================================
-- PART 4: CREATE LIMITS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  period TEXT DEFAULT 'monthly',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_limits_user_id ON public.limits(user_id);

ALTER TABLE public.limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own limits" 
  ON public.limits FOR ALL 
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- PART 5: CREATE GOALS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target NUMERIC NOT NULL,
  current NUMERIC DEFAULT 0,
  deadline DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own goals" 
  ON public.goals FOR ALL 
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- PART 6: CREATE TELEGRAM_USERS LINKING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.telegram_users (
  id BIGSERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  telegram_username TEXT,
  first_name TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  linking_code TEXT UNIQUE,
  code_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_users_telegram_id ON public.telegram_users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_telegram_users_user_id ON public.telegram_users(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_users_linking_code ON public.telegram_users(linking_code);

ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own telegram account" 
  ON public.telegram_users FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own telegram account" 
  ON public.telegram_users FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage telegram users" 
  ON public.telegram_users FOR ALL 
  USING (auth.role() = 'service_role');

-- ============================================
-- PART 7: CREATE TRIGGERS
-- ============================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at on profiles
CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_profiles_timestamp ON public.profiles;
CREATE TRIGGER update_profiles_timestamp
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_profiles_updated_at();

-- Auto-update updated_at on transactions
CREATE OR REPLACE FUNCTION public.update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_transactions_timestamp ON public.transactions;
CREATE TRIGGER update_transactions_timestamp
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_transactions_updated_at();

-- ============================================
-- PART 8: HELPER FUNCTION TO LINK TELEGRAM ACCOUNT
-- ============================================

CREATE OR REPLACE FUNCTION public.link_telegram_account(
  p_user_id UUID,
  p_telegram_id BIGINT,
  p_telegram_username TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update or insert telegram user
  INSERT INTO public.telegram_users (telegram_id, telegram_username, user_id)
  VALUES (p_telegram_id, p_telegram_username, p_user_id)
  ON CONFLICT (telegram_id) 
  DO UPDATE SET 
    user_id = p_user_id,
    telegram_username = COALESCE(EXCLUDED.telegram_username, telegram_users.telegram_username),
    last_active = NOW();
  
  -- Update profile with telegram info
  UPDATE public.profiles
  SET telegram_id = p_telegram_id,
      telegram_username = COALESCE(p_telegram_username, telegram_username)
  WHERE id = p_user_id;
  
  -- Link existing telegram transactions to this user
  UPDATE public.telegram_transactions
  SET user_id = p_user_id
  WHERE telegram_user_id = p_telegram_id
    AND user_id IS NULL;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- PART 9: HELPER FUNCTION TO SYNC TELEGRAM TRANSACTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.sync_telegram_transactions(p_user_id UUID)
RETURNS TABLE(synced_count INTEGER) AS $$
DECLARE
  v_telegram_id BIGINT;
  v_synced_count INTEGER := 0;
BEGIN
  -- Get user's telegram_id
  SELECT telegram_id INTO v_telegram_id
  FROM public.profiles
  WHERE id = p_user_id;
  
  IF v_telegram_id IS NULL THEN
    RETURN QUERY SELECT 0;
    RETURN;
  END IF;
  
  -- Copy unsynced telegram transactions to main transactions table
  INSERT INTO public.transactions (
    user_id, date, amount, category_id, description, type, source, telegram_id
  )
  SELECT 
    p_user_id,
    DATE(created_at),
    amount,
    category_id,
    description,
    type,
    'telegram',
    telegram_user_id
  FROM public.telegram_transactions
  WHERE telegram_user_id = v_telegram_id
    AND synced = FALSE
    AND (user_id = p_user_id OR user_id IS NULL);
  
  GET DIAGNOSTICS v_synced_count = ROW_COUNT;
  
  -- Mark as synced
  UPDATE public.telegram_transactions
  SET synced = TRUE, user_id = p_user_id
  WHERE telegram_user_id = v_telegram_id
    AND synced = FALSE;
  
  RETURN QUERY SELECT v_synced_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

