// API client that calls YOUR external Supabase Edge Functions
// Project: xpplhbxxzhgcncfvwaun (YOUR external Supabase)

import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = 'https://xpplhbxxzhgcncfvwaun.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// For push notifications, use the local Supabase URL (where user_devices table is)
// Get it from the supabase client instance
const getLocalSupabaseUrl = () => {
  // Try to get from env first, then from supabase client
  return import.meta.env.VITE_SUPABASE_URL || (supabase as any).supabaseUrl;
};

async function invokeEdgeFunction(functionName: string, data: unknown, requireAuth = false): Promise<any> {
  try {
    // Get auth token if required
    let authToken = SUPABASE_ANON_KEY;
    if (requireAuth) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        authToken = session.access_token;
      }
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn(`Rate limited on ${functionName}`);
        return { error: 'Rate limited. Please try again later.' };
      }
      if (response.status === 402) {
        console.warn(`Payment required for ${functionName}`);
        return { error: 'AI credits exhausted.' };
      }
      
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Edge function error: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error(`Edge function ${functionName} failed:`, err);
    throw err;
  }
}

export const api = {
  // AI & ML Functions (on YOUR external Supabase)
  scanReceipt: (data: any) => invokeEdgeFunction("scan-receipt", data),
  parseVoice: (data: any) => invokeEdgeFunction("parse-voice", data),
  getStockPrice: (data: any) => invokeEdgeFunction("get-stock-price", data),
  aiCopilot: (data: any) => invokeEdgeFunction("ai-copilot", data),
  financePlanner: (data: any) => invokeEdgeFunction("finance-planner", data),
  sendDailySummary: (data: any) => invokeEdgeFunction("telegram-daily-summary", data),
  // Insights endpoint (authenticated)
  insights: (data: any) => invokeEdgeFunction("insights", data, true),
  // Push notifications (authenticated) - uses local Supabase where user_devices table is
  sendPushNotification: async (data: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || SUPABASE_ANON_KEY;
      const localUrl = getLocalSupabaseUrl();

      const response = await fetch(`${localUrl}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Edge function error: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.error('send-push-notification failed:', err);
      throw err;
    }
  },
};
