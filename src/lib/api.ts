// API Configuration for self-hosted deployment
// Set VITE_API_URL in .env to your Railway backend URL

const API_BASE = import.meta.env.VITE_API_URL || '';
const USE_SUPABASE = !API_BASE; // Use Supabase if no custom API URL is set

import { supabase } from '@/integrations/supabase/client';

interface ScanReceiptParams {
  image: string;
  mimeType?: string;
  userId?: string;
}

interface ParseVoiceParams {
  text: string;
  lang?: string;
}

interface GetStockPriceParams {
  symbol: string;
  type?: 'stock' | 'crypto';
}

// Receipt scanning
export async function scanReceipt(params: ScanReceiptParams) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase.functions.invoke('scan-receipt', {
      body: params
    });
    if (error) throw error;
    return data;
  }
  
  const response = await fetch(`${API_BASE}/api/scan-receipt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to scan receipt');
  }
  
  return response.json();
}

// Voice command parsing
export async function parseVoice(params: ParseVoiceParams) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase.functions.invoke('parse-voice', {
      body: params
    });
    if (error) throw error;
    return data;
  }
  
  const response = await fetch(`${API_BASE}/api/parse-voice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to parse voice command');
  }
  
  return response.json();
}

// Stock/crypto price lookup
export async function getStockPrice(params: GetStockPriceParams) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase.functions.invoke('get-stock-price', {
      body: params
    });
    if (error) throw error;
    return data;
  }
  
  const response = await fetch(`${API_BASE}/api/get-stock-price`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get stock price');
  }
  
  return response.json();
}
