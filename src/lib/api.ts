const API_BASE_RAW = import.meta.env.VITE_API_URL || "https://telegram-finance-hub-production.up.railway.app";

// Normalize common deployment mistakes (extra quotes/spaces, trailing slash)
const API_BASE = API_BASE_RAW.trim().replace(/^"|"$/g, "").replace(/\/$/, "");

async function fetchJson(path: string, data: unknown): Promise<any> {
  const url = `${API_BASE}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch (err) {
    // Network/CORS/DNS/etc.
    throw new Error(`Network error calling ${url}. ${err instanceof Error ? err.message : String(err)}`);
  }

  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    // ignore
  }

  if (!res.ok) {
    const msg = payload?.error || payload?.message || `HTTP ${res.status}`;
    throw new Error(`API error from ${url}: ${msg}`);
  }

  return payload;
}


export const api = {
  scanReceipt: (data: any) => fetchJson("/api/scan-receipt", data),
  parseVoice: (data: any) => fetchJson("/api/parse-voice", data),
  getStockPrice: (data: any) => fetchJson("/api/get-stock-price", data),
  aiCopilot: (data: any) => fetchJson("/api/ai-copilot", data),
  financePlanner: (data: any) => fetchJson("/api/finance-planner", data),
};
