-- Create telegram_transactions table to store transactions from Telegram bot
CREATE TABLE public.telegram_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_user_id BIGINT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  category_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  currency TEXT NOT NULL DEFAULT 'UZS',
  source TEXT NOT NULL DEFAULT 'telegram',
  synced BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries by telegram user
CREATE INDEX idx_telegram_transactions_user ON public.telegram_transactions(telegram_user_id);
CREATE INDEX idx_telegram_transactions_synced ON public.telegram_transactions(synced);

-- Enable Row Level Security
ALTER TABLE public.telegram_transactions ENABLE ROW LEVEL SECURITY;

-- Create policy for public insert (from edge function)
CREATE POLICY "Allow public insert for telegram transactions"
ON public.telegram_transactions
FOR INSERT
WITH CHECK (true);

-- Create policy for public select (for syncing)
CREATE POLICY "Allow public select for telegram transactions"
ON public.telegram_transactions
FOR SELECT
USING (true);

-- Create policy for public update (for marking as synced)
CREATE POLICY "Allow public update for telegram transactions"
ON public.telegram_transactions
FOR UPDATE
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_telegram_tx_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_telegram_transactions_timestamp
BEFORE UPDATE ON public.telegram_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_telegram_tx_timestamp();