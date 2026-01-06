// API client for your own backend server (Railway/self-hosted)
// Set VITE_API_URL in your environment or use the default

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function callApi(endpoint: string, data: unknown): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error(`API call to ${endpoint} failed:`, err);
    throw err;
  }
}

export const api = {
  scanReceipt: (data: any) => callApi("/scan-receipt", data),
  parseVoice: (data: any) => callApi("/parse-voice", data),
  getStockPrice: (data: any) => callApi("/get-stock-price", data),
  aiCopilot: (data: any) => callApi("/ai-copilot", data),
  financePlanner: (data: any) => callApi("/finance-planner", data),
};
