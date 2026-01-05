-- Enable RLS (Row Level Security)
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  telegram_id BIGINT UNIQUE,
  telegram_username TEXT,
  pin_hash TEXT, -- Encrypted 4-digit PIN for quick access
  biometric_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Add user_id to transactions table (if not exists)
ALTER TABLE transactions 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);

-- Enable RLS on transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Transactions policies
CREATE POLICY "Users can view own transactions" 
  ON transactions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" 
  ON transactions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" 
  ON transactions FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" 
  ON transactions FOR DELETE 
  USING (auth.uid() = user_id);

-- Add user_id to limits table
ALTER TABLE limits 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_limits_user_id ON limits(user_id);

ALTER TABLE limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own limits" 
  ON limits FOR ALL 
  USING (auth.uid() = user_id);

-- Add user_id to goals table
ALTER TABLE goals 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own goals" 
  ON goals FOR ALL 
  USING (auth.uid() = user_id);

-- Add user_id to recurring_transactions table
ALTER TABLE recurring_transactions 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_recurring_user_id ON recurring_transactions(user_id);

ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own recurring" 
  ON recurring_transactions FOR ALL 
  USING (auth.uid() = user_id);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create table for email verification codes (optional - Supabase handles this)
CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  type TEXT NOT NULL, -- 'email_verification', 'password_reset', 'pin_reset'
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_codes_user_id ON verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON verification_codes(code);

-- Create session_devices table for tracking devices
CREATE TABLE IF NOT EXISTS session_devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT,
  device_type TEXT, -- 'mobile', 'tablet', 'desktop'
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_devices_user_id ON session_devices(user_id);

-- Enable RLS
ALTER TABLE session_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own devices" 
  ON session_devices FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own devices" 
  ON session_devices FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own devices" 
  ON session_devices FOR DELETE 
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Update existing transactions to set user_id (if migrating from non-auth version)
-- This should be done carefully based on telegram_id or other identifiers
-- Example:
-- UPDATE transactions t
-- SET user_id = p.id
-- FROM profiles p
-- WHERE t.telegram_id = p.telegram_id AND t.user_id IS NULL;
