# Hamyon Deployment Guide

This guide helps you deploy Hamyon with:
- **Frontend**: Vercel
- **Backend**: Railway

---

## 🔑 Required API Keys

| Key | Purpose | Get it from |
|-----|---------|-------------|
| **OPENAI_API_KEY** | Receipt OCR & Voice parsing | [platform.openai.com](https://platform.openai.com/api-keys) |
| **ALPHA_VANTAGE_API_KEY** | Stock/crypto prices | [alphavantage.co](https://www.alphavantage.co/support/#api-key) (free) |
| **BOT_TOKEN** (optional) | Telegram bot | [@BotFather](https://t.me/botfather) |

---

## 🚂 Backend Deployment (Railway)

### Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your repository
4. Set the **Root Directory** to `backend`

### Step 2: Configure Environment Variables

In Railway dashboard, go to **Variables** and add:

```env
PORT=3000
OPENAI_API_KEY=sk-your-openai-key
ALPHA_VANTAGE_API_KEY=your-alpha-vantage-key

# Optional - Telegram Bot
BOT_TOKEN=your-telegram-bot-token
WEBHOOK_URL=https://your-app.railway.app
MINI_APP_URL=https://your-frontend.vercel.app
```

### Step 3: Deploy

Railway will auto-deploy when you push to GitHub.

Your backend URL will be something like: `https://hamyon-backend-production.up.railway.app`

---

## ▲ Frontend Deployment (Vercel)

### Step 1: Update API URLs

Before deploying, update the frontend to point to your Railway backend.

Create/update `src/lib/api.ts`:

```typescript
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
```

### Step 2: Create Vercel Project

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New"** → **"Project"**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `.` (root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Step 3: Add Environment Variables

In Vercel dashboard → Settings → Environment Variables:

```env
VITE_API_URL=https://your-app.railway.app
```

### Step 4: Deploy

Click **Deploy**. Your frontend will be at: `https://your-app.vercel.app`

---

## 🔄 Update Frontend Code

Replace Supabase edge function calls with your Railway API:

### Before (Supabase):
```typescript
const { data } = await supabase.functions.invoke('scan-receipt', { body: { image } });
```

### After (Railway):
```typescript
const data = await api.scanReceipt({ image, mimeType: 'image/jpeg' });
```

---

## 📁 Files to Update

1. **`src/components/ReceiptScanner.tsx`** - Update `scan-receipt` call
2. **`src/components/VoiceInput.tsx`** - Update `parse-voice` call  
3. **`src/components/InvestmentsScreen.tsx`** - Update `get-stock-price` call

---

## 🧪 Testing

1. **Backend Health Check**: 
   ```
   curl https://your-app.railway.app/health
   ```

2. **Test Receipt Scan**:
   ```bash
   curl -X POST https://your-app.railway.app/api/scan-receipt \
     -H "Content-Type: application/json" \
     -d '{"image": "base64_image_data", "mimeType": "image/jpeg"}'
   ```

---

## 🔒 Security Notes

- Never commit `.env` files with real API keys
- Use environment variables in Railway/Vercel
- The backend has CORS enabled for all origins - restrict this in production:

```javascript
// In backend/server.js, replace:
app.use(cors());

// With:
app.use(cors({
  origin: ['https://your-app.vercel.app'],
  credentials: true
}));
```

---

## 📊 Database (Optional)

The current backend uses in-memory storage. For production, add a database:

### Option 1: Railway PostgreSQL

1. In Railway, click **"+ New"** → **"Database"** → **"PostgreSQL"**
2. Copy the `DATABASE_URL`
3. Add to environment variables
4. Update `server.js` to use a proper ORM (Prisma, Drizzle, etc.)

### Option 2: Supabase (just database)

You can still use Supabase just for the database without the edge functions:

```env
DATABASE_URL=postgresql://postgres:password@db.project.supabase.co:5432/postgres
```

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS errors | Check `VITE_API_URL` matches Railway URL exactly |
| 500 errors on receipt scan | Verify `OPENAI_API_KEY` is set |
| Stock prices not loading | Check `ALPHA_VANTAGE_API_KEY` |
| Telegram bot not responding | Verify `BOT_TOKEN` and run `/setWebhook` endpoint |

---

## 💰 Cost Estimates

| Service | Free Tier | Paid |
|---------|-----------|------|
| **Vercel** | 100GB bandwidth/month | $20/month pro |
| **Railway** | $5 free credits/month | ~$5-20/month |
| **OpenAI** | - | ~$0.01-0.05 per receipt |
| **Alpha Vantage** | 25 requests/day | $50/month premium |

Total estimated cost for moderate usage: **$5-20/month**
