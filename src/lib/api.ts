const API_BASE = import.meta.env.VITE_API_URL || 'https://telegram-finance-hub-production.up.railway.app';

export const api = {
  scanReceipt: (data: any) => fetch(`${API_BASE}/api/scan-receipt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json()),

  parseVoice: (data: any) => fetch(`${API_BASE}/api/parse-voice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json()),

  getStockPrice: (data: any) => fetch(`${API_BASE}/api/get-stock-price`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json()),

  aiCopilot: (data: any) => fetch(`${API_BASE}/api/ai-copilot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json()),

  financePlanner: (data: any) => fetch(`${API_BASE}/api/finance-planner`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json()),
};
