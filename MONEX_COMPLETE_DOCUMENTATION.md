# MonEX - Complete Application Documentation

## 🌟 Overview

MonEX is a revolutionary **Behavioral Finance AI** application that transforms personal finance management. Unlike traditional budgeting apps that simply track spending, MonEX observes, understands, and intervenes in financial behavior.

**Revolutionary Vision (Three Paths):**
- **PATH A**: Financial Copilot for the Real World - AI that detects stress spending, predicts financial problems, and intervenes before disaster
- **PATH B**: Telegram = The New Banking OS - Chat-native financial operating system with zero learning curve
- **PATH C**: Natural Language Financial Logic - Generate budgets, rules, and plans from natural language

---

## 🏗️ Architecture

### Technology Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Styling** | Tailwind CSS + shadcn/ui |
| **State Management** | React Context API |
| **Animations** | Framer Motion |
| **Backend** | Supabase (PostgreSQL + Edge Functions) |
| **AI** | OpenAI GPT-4o-mini + Google Gemini |
| **Authentication** | Supabase Auth (Email/Password + Google OAuth) |
| **Mobile** | Capacitor (Android/iOS) |
| **Bot** | Telegram Bot API |

### Project Structure

```
monex/
├── src/
│   ├── components/          # React components
│   │   ├── HomeScreen.tsx   # Main dashboard
│   │   ├── TransactionsScreen.tsx
│   │   ├── GoalsScreen.tsx
│   │   ├── AnalyticsScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   ├── AIInsightsWidget.tsx    # AI behavioral insights
│   │   ├── AICopilotPanel.tsx      # Full AI chat interface
│   │   ├── BudgetSimulatorModal.tsx # "What if" scenarios
│   │   ├── ReceiptScanner.tsx      # OCR receipt scanning
│   │   ├── VoiceInput.tsx          # Voice transaction input
│   │   └── ...
│   ├── context/
│   │   └── AppContext.tsx   # Global state management
│   ├── hooks/
│   │   ├── useAuth.ts       # Authentication hook
│   │   ├── useSupabaseData.ts # Data fetching
│   │   └── useCurrency.ts   # Currency formatting
│   ├── lib/
│   │   ├── api.ts           # Edge function calls
│   │   ├── storage.ts       # Local storage utilities
│   │   └── anomalyDetector.ts # Spending pattern detection
│   ├── pages/
│   │   ├── Auth.tsx         # Login/Signup/Forgot Password
│   │   └── Index.tsx        # Main app entry
│   └── integrations/
│       └── supabase/        # Supabase client & types
├── supabase/
│   └── functions/           # Edge Functions
│       ├── ai-copilot/      # AI behavioral analysis
│       ├── telegram-webhook/ # Telegram bot handler
│       ├── scan-receipt/    # OCR receipt processing
│       ├── parse-voice/     # Voice command parsing
│       └── get-stock-price/ # Investment tracking
└── android/                 # Capacitor Android build
```

---

## 🔐 Authentication System

### Features
- **Email/Password** registration and login
- **Google OAuth** integration
- **Password Reset** via email
- **Session Management** with auto-refresh
- **Guest Mode** for trying the app

### Configuration (External Supabase)

**Environment Variables (.env):**
```env
VITE_SUPABASE_URL=https://xpplhbxxzhgcncfvwaun.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
```

**Supabase Auth Settings:**
- Site URL: `https://telegram-finance-hub.vercel.app`
- Redirect URLs:
  - `https://telegram-finance-hub.vercel.app/**`
  - `http://localhost:5173/**`

---

## 🧠 PATH A: AI Behavioral Copilot

### How It Works

The AI Copilot analyzes spending patterns and provides behavioral interventions:

**Detection Framework:**

1. **Stress Spending Patterns**
   - Late-night purchases (21:00-06:00) = emotional regulation via shopping
   - Multiple small transactions same day = impulse control issues
   - Weekend overspending = work stress compensation

2. **Predictive Warnings**
   - "At this rate, balance = 0 in X days"
   - "You'll miss rent in 12 days if spending continues"
   - "4th taxi this week after 9pm - stress pattern detected"

3. **Behavioral Interventions**
   - "Set a 50,000 UZS taxi limit for this week"
   - "Enable cooling-off period: 1-hour delay before purchases > 100K"
   - "Your stress spending costs you 300K/month"

### Edge Function: `ai-copilot/index.ts`

**Request:**
```json
{
  "transactions": [...],
  "balance": 1500000,
  "currency": "UZS",
  "limits": [...],
  "goals": [...],
  "lang": "uz"
}
```

**Response:**
```json
{
  "insights": [
    {
      "type": "warning",
      "severity": "high",
      "icon": "⚠️",
      "title": "Balance hits 0 in 5 days",
      "message": "At current spending (200K/day), balance will hit zero in 5 days.",
      "action": "set_limit",
      "actionLabel": "Set Limit"
    }
  ]
}
```

---

## 📱 PATH B: Telegram Bot Integration

### Available Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message and instructions |
| `/link CODE` | Link Telegram to MonEX account |
| `/unlink` | Disconnect Telegram account |
| `/balance` | Check current balance |
| `/help` | Show help menu |

### Quick Expense Entry

Simply type expense descriptions:
- `Taxi 50000` → Adds 50,000 UZS taxi expense
- `Qahva 15k` → Adds 15,000 UZS coffee expense
- `Shopping 200000` → Adds 200,000 UZS shopping expense

### Receipt Scanning

Send a photo of any receipt → AI extracts:
- Store name
- Total amount
- Individual items
- Date

### Account Linking Flow

1. Open MonEX app → Settings → Telegram Bot
2. Click "Generate Code"
3. Send `/link YOUR_CODE` to the bot
4. Accounts are synced - transactions appear in both!

### Edge Function: `telegram-webhook/index.ts`

Handles all incoming Telegram messages with:
- AI-powered natural language understanding
- Receipt OCR via Gemini Vision
- Real-time sync with app database

---

## 🧮 Budget Simulator (What-If Analysis)

### How It Works

1. Select a spending category (taxi, coffee, shopping, etc.)
2. Set reduction percentage (10% to 100%)
3. See projected impact:
   - Monthly savings
   - Yearly savings
   - Days until goal achieved

### Example

**"What if I reduce taxi spending by 50%?"**

| Metric | Value |
|--------|-------|
| Current taxi spending | 400,000 UZS/month |
| After 50% reduction | 200,000 UZS/month |
| Monthly savings | +200,000 UZS |
| Yearly savings | +2,400,000 UZS |
| Days to "New Car" goal | 120 days |

---

## 📊 Database Schema

### Tables

**profiles**
```sql
- id (UUID, PK)
- email (TEXT)
- full_name (TEXT)
- telegram_id (BIGINT)
- telegram_username (TEXT)
- avatar_url (TEXT)
- created_at, updated_at (TIMESTAMP)
```

**transactions**
```sql
- id (UUID, PK)
- user_id (UUID, FK)
- amount (NUMERIC) -- negative = expense, positive = income
- category_id (TEXT)
- description (TEXT)
- date (DATE)
- type (TEXT) -- 'expense' or 'income'
- source (TEXT) -- 'app', 'telegram', 'voice', 'receipt'
- telegram_id (BIGINT)
- created_at, updated_at (TIMESTAMP)
```

**goals**
```sql
- id (UUID, PK)
- user_id (UUID, FK)
- name (TEXT)
- target (NUMERIC)
- current (NUMERIC)
- deadline (DATE)
- created_at (TIMESTAMP)
```

**limits**
```sql
- id (UUID, PK)
- user_id (UUID, FK)
- category_id (TEXT)
- amount (NUMERIC)
- period (TEXT) -- 'weekly', 'monthly'
- created_at (TIMESTAMP)
```

**telegram_users**
```sql
- id (BIGINT, PK)
- telegram_id (BIGINT, UNIQUE)
- user_id (UUID, FK)
- telegram_username (TEXT)
- first_name (TEXT)
- linking_code (TEXT)
- code_expires_at (TIMESTAMP)
- last_active (TIMESTAMP)
```

### Row Level Security (RLS)

All tables have RLS enabled:
- Users can only read/write their own data
- `user_id = auth.uid()` check on all operations

---

## 🚀 Deployment Guide

### Vercel (Frontend)

1. **Connect GitHub Repository**
   ```bash
   vercel link
   ```

2. **Set Environment Variables**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Supabase Edge Functions

Edge functions are deployed automatically when code is pushed. Secrets required:

| Secret | Description |
|--------|-------------|
| `OPENAI_API_KEY` | For AI copilot |
| `GEMINI_API_KEY` | For Telegram bot AI |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token |
| `ALPHA_VANTAGE_API_KEY` | Stock prices |

### Telegram Webhook Setup

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://xpplhbxxzhgcncfvwaun.supabase.co/functions/v1/telegram-webhook"}'
```

---

## 📲 Play Store Deployment

### Prerequisites

1. **Google Play Developer Account** ($25 one-time fee)
2. **App signing key** (keystore file)
3. **Privacy Policy URL** (required)

### Build Process

1. **Update `capacitor.config.ts`**
   ```typescript
   const config: CapacitorConfig = {
     appId: 'uz.monex.app',
     appName: 'MonEX',
     webDir: 'dist',
     bundledWebRuntime: false
   };
   ```

2. **Build web assets**
   ```bash
   npm run build
   npx cap sync android
   ```

3. **Open in Android Studio**
   ```bash
   npx cap open android
   ```

4. **Generate Signed APK/Bundle**
   - Build → Generate Signed Bundle/APK
   - Choose Android App Bundle (recommended)
   - Sign with your keystore

5. **Upload to Play Console**
   - Create new app in Play Console
   - Complete store listing (screenshots, description, etc.)
   - Upload AAB file to Production track
   - Submit for review

### Required Store Listing Assets

- App icon: 512x512 PNG
- Feature graphic: 1024x500 PNG
- Screenshots: minimum 2, recommended 8
- Short description: 80 chars max
- Full description: 4000 chars max

---

## 🍎 App Store Deployment

### Prerequisites

1. **Apple Developer Account** ($99/year)
2. **Mac with Xcode** (required)
3. **App Store Connect** access

### Build Process

1. **Sync iOS project**
   ```bash
   npm run build
   npx cap sync ios
   ```

2. **Open in Xcode**
   ```bash
   npx cap open ios
   ```

3. **Configure signing**
   - Select your Team
   - Set Bundle Identifier: `uz.monex.app`
   - Configure capabilities

4. **Archive and Upload**
   - Product → Archive
   - Distribute App → App Store Connect
   - Upload

5. **Submit in App Store Connect**
   - Create new app
   - Fill in metadata
   - Add screenshots for all device sizes
   - Submit for review

### Required Store Assets

- App icon: 1024x1024 PNG (no transparency)
- Screenshots for:
  - iPhone 6.5" (1284x2778)
  - iPhone 5.5" (1242x2208)
  - iPad Pro 12.9" (2048x2732)
- App Preview videos (optional)
- Privacy Policy URL

---

## 🔧 Local Development

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Environment Variables

Create `.env` file:
```env
VITE_SUPABASE_URL=https://xpplhbxxzhgcncfvwaun.supabase.co
VITE_SUPABASE_ANON_KEY=your_key
VITE_SUPABASE_PUBLISHABLE_KEY=your_key
```

### Edge Functions Development

```bash
# Serve locally
supabase functions serve

# Deploy
supabase functions deploy function-name
```

---

## 📈 Feature Summary

| Feature | Status | Location |
|---------|--------|----------|
| Transaction tracking | ✅ Complete | HomeScreen, TransactionsScreen |
| AI behavioral insights | ✅ Complete | AIInsightsWidget, ai-copilot edge function |
| Budget simulator | ✅ Complete | BudgetSimulatorModal |
| Telegram bot | ✅ Complete | telegram-webhook edge function |
| Receipt scanning | ✅ Complete | ReceiptScanner, scan-receipt edge function |
| Voice input | ✅ Complete | VoiceInput, parse-voice edge function |
| Goals tracking | ✅ Complete | GoalsScreen |
| Spending limits | ✅ Complete | LimitsScreen |
| Analytics | ✅ Complete | AnalyticsScreen |
| Multi-language | ✅ Complete | uz, ru, en |
| Dark mode | ✅ Complete | ThemeToggle |
| Google OAuth | ✅ Complete | Auth.tsx |
| Password reset | ✅ Complete | Auth.tsx |

---

## 🌍 Localization

MonEX supports three languages:
- 🇺🇿 **O'zbekcha** (Uzbek)
- 🇷🇺 **Русский** (Russian)  
- 🇬🇧 **English**

All UI text is dynamically translated based on user preference.

---

## 🔒 Security

- **Row Level Security (RLS)** on all database tables
- **JWT Authentication** for API access
- **Secure session management** with auto-refresh
- **Input validation** on all forms
- **CORS protection** on edge functions
- **Environment variable separation** for secrets

---

## 📞 Support

- **Telegram Bot**: @hamyon_uz_aibot
- **Email**: support@monex.uz
- **GitHub**: Issues for bug reports

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01 | Initial release with core features |
| 1.1.0 | 2025-01 | Added AI copilot, budget simulator |
| 1.2.0 | 2025-01 | Telegram integration, receipt scanning |
| 1.3.0 | 2025-01 | Google OAuth, password reset, improved UX |

---

**MonEX** - Your Financial Copilot 🚀

*Not just tracking. Understanding. Intervening. Saving.*
