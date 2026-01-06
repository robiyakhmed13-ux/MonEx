import { supabase } from "@/integrations/supabase/client";

// Call Supabase Edge Functions directly (works independently of Railway)
async function invokeEdgeFunction(functionName: string, data: unknown): Promise<any> {
  try {
    const { data: result, error } = await supabase.functions.invoke(functionName, {
      body: data,
    });

    if (error) {
      console.error(`Edge function ${functionName} error:`, error);
      throw new Error(error.message || `Error calling ${functionName}`);
    }

    return result;
  } catch (err) {
    console.error(`Failed to invoke ${functionName}:`, err);
    throw err;
  }
}

export const api = {
  scanReceipt: (data: any) => invokeEdgeFunction("scan-receipt", data),
  parseVoice: (data: any) => invokeEdgeFunction("parse-voice", data),
  getStockPrice: (data: any) => invokeEdgeFunction("get-stock-price", data),
  aiCopilot: (data: any) => invokeEdgeFunction("ai-copilot", data),
  financePlanner: (data: any) => invokeEdgeFunction("finance-planner", data),
};
