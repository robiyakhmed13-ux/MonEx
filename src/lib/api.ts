const API_BASE = import.meta.env.VITE_API_URL || 'https://your-app.railway.app';

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
};
