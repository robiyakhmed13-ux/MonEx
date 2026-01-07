-- ============================================
-- PUSH NOTIFICATIONS: USER_DEVICES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_id TEXT, -- Optional: unique device identifier
  app_version TEXT,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, device_token)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON public.user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_token ON public.user_devices(device_token);
CREATE INDEX IF NOT EXISTS idx_user_devices_platform ON public.user_devices(platform);

-- Enable RLS
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own devices" 
  ON public.user_devices FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own devices" 
  ON public.user_devices FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own devices" 
  ON public.user_devices FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own devices" 
  ON public.user_devices FOR DELETE 
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all devices" 
  ON public.user_devices FOR ALL 
  USING (auth.role() = 'service_role');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_user_devices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_user_devices_timestamp ON public.user_devices;
CREATE TRIGGER update_user_devices_timestamp
  BEFORE UPDATE ON public.user_devices
  FOR EACH ROW EXECUTE FUNCTION public.update_user_devices_updated_at();

-- Function to upsert device token
CREATE OR REPLACE FUNCTION public.upsert_device_token(
  p_user_id UUID,
  p_device_token TEXT,
  p_platform TEXT,
  p_device_id TEXT DEFAULT NULL,
  p_app_version TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_device_id UUID;
BEGIN
  INSERT INTO public.user_devices (user_id, device_token, platform, device_id, app_version, last_active)
  VALUES (p_user_id, p_device_token, p_platform, p_device_id, p_app_version, NOW())
  ON CONFLICT (user_id, device_token) 
  DO UPDATE SET
    last_active = NOW(),
    platform = EXCLUDED.platform,
    device_id = COALESCE(EXCLUDED.device_id, user_devices.device_id),
    app_version = COALESCE(EXCLUDED.app_version, user_devices.app_version),
    updated_at = NOW()
  RETURNING id INTO v_device_id;
  
  RETURN v_device_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

