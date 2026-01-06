// API client that calls YOUR external Supabase Edge Functions
// Project: xpplhbxxzhgcncfvwaun (YOUR external Supabase)

const SUPABASE_URL = 'https://xpplhbxxzhgcncfvwaun.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function invokeEdgeFunction(functionName: string, data: unknown): Promise<any> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
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
};