// API client that calls YOUR external Supabase Edge Functions directly
// Project: xpplhbxxzhgcncfvwaun

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://xpplhbxxzhgcncfvwaun.supabase.co';
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
  // These call YOUR external Supabase edge functions
  scanReceipt: (data: any) => invokeEdgeFunction("scan-receipt", data),
  parseVoice: (data: any) => invokeEdgeFunction("parse-voice", data),
  getStockPrice: (data: any) => invokeEdgeFunction("get-stock-price", data),
  aiCopilot: (data: any) => invokeEdgeFunction("ai-copilot", data),
  financePlanner: (data: any) => invokeEdgeFunction("finance-planner", data),
};
