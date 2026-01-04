# MonEX - Revolutionary Financial Management App

## 📱 Overview

**MonEX** is a next-generation personal finance application that combines behavioral AI, natural language processing, and chat-native interfaces to provide a revolutionary financial management experience.

### Vision
> "People don't manage money. They react to life."

MonEX is built on three revolutionary paths:
- **PATH A**: AI Financial Copilot - Behavioral finance × AI × real-time messaging
- **PATH B**: Telegram as Banking OS - Chat-native financial operating system
- **PATH C**: Natural Language Financial Logic - Generate budgets, rules, and plans from plain text

---

## 🚀 Core Features

### 1. Transaction Management
- **Quick Add**: One-tap expense/income entry with customizable amounts
- **Voice Input**: Speak naturally to add transactions ("Потратил 50 тысяч на такси")
- **Receipt Scanner**: AI-powered receipt parsing via camera
- **Categories**: 20+ predefined categories with custom icons

### 2. AI Financial Copilot (PATH A)
Located in: `src/components/AICopilotPanel.tsx`

**What it does:**
- Analyzes spending patterns and behaviors
- Detects stress spending (late-night purchases, emotional patterns)
- Predicts future financial issues ("You'll miss rent in 12 days")
- Provides actionable interventions

**Key Features:**
- Pattern detection: "This is your 4th taxi this week after 9pm"
- Behavioral insights: "Your stress spending increased after salary delay"
- Predictive warnings: "If you continue like this, balance = 0 in X days"
- Actionable suggestions: "Set a 50k taxi limit for this week"

**Edge Function:** `supabase/functions/ai-copilot/index.ts`
- Uses Lovable AI (Gemini 2.5 Flash) for analysis
- No external API key required

### 3. AI Insights Widget
Located in: `src/components/AIInsightsWidget.tsx`

- Mini insight cards on home screen
- Auto-refreshes every 6 hours
- Cached for performance
- Shows top 3 behavioral insights

### 4. Finance Planner (PATH C)
Located in: `src/components/FinancePlannerModal.tsx`

**What it does:**
- Generates financial logic from natural language
- "Хочу накопить на машину за год" → automated savings plan

**Key Features:**
- Natural language input
- AI-generated monthly savings targets
- Step-by-step action plans
- Goal monitoring and tracking

**Edge Function:** `supabase/functions/finance-planner/index.ts`

### 5. Budget Simulator
Located in: `src/components/BudgetSimulatorModal.tsx`

**What it does:**
- "What if" scenario analysis
- "What if I reduce taxi spending by 50%?"

**Key Features:**
- Category selection based on actual spending
- Slider for reduction percentage (10-100%)
- Monthly and yearly savings projections
- Days-to-goal calculation

### 6. Telegram Bot (PATH B)
Located in: `supabase/functions/telegram-bot/index.ts`

**Commands:**
| Command | Description |
|---------|-------------|
| `/start` | Initialize bot, show main menu |
| `/add` | Add new transaction |
| `/balance` | View current balance |
| `/stats` | View spending statistics |
| `/limit` | Manage category limits |
| `/goal` | Manage savings goals |
| `/remind` | Set payment reminders |

**Features:**
- Inline keyboard buttons
- Period selection (today/week/month)
- Real-time transaction notifications
- Beautiful formatted messages

### 7. Telegram Daily Summary
Located in: `supabase/functions/telegram-daily-summary/index.ts`

**What it does:**
- Sends daily financial summary at 21:00
- Configurable timezone
- Multi-language support (UZ/RU/EN)

**Summary includes:**
- Total income and expenses
- Day balance
- Top spending categories
- Transaction count

### 8. Subscriptions & Recurring Payments
Located in: `src/components/SubscriptionsScreen.tsx`, `src/components/RecurringScreen.tsx`

**Features:**
- Track Netflix, Spotify, etc.
- Automatic reminder notifications
- Due soon alerts
- Monthly total calculation

### 9. Goals & Savings
Located in: `src/components/GoalsScreen.tsx`

**Features:**
- Create savings goals
- Track progress visually
- AI-powered goal planning
- Deposit functionality

### 10. Budget Limits
Located in: `src/components/LimitsScreen.tsx`

**Features:**
- Set limits per category
- Real-time usage tracking
- Warning when approaching limit
- Alert when exceeded

### 11. Analytics & Reports
Located in: `src/components/AnalyticsScreen.tsx`, `src/components/ReportsScreen.tsx`

**Features:**
- Visual spending charts
- Category breakdown
- Weekly/monthly trends
- Export to PDF

---

## 🛠️ Technical Architecture

### Frontend Stack
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Shadcn/UI** components
- **Recharts** for charts

### Backend (Lovable Cloud)
- **Supabase** (via Lovable Cloud)
- **Edge Functions** for AI processing
- **PostgreSQL** for data storage
- **Real-time subscriptions** for live updates

### Mobile (Capacitor)
- **Capacitor** for native iOS/Android
- **Native plugins** for camera, storage

---

## 📁 Project Structure

```
src/
├── components/
│   ├── HomeScreen.tsx          # Main dashboard
│   ├── AICopilotPanel.tsx      # AI behavioral analysis
│   ├── AIInsightsWidget.tsx    # Mini insights cards
│   ├── FinancePlannerModal.tsx # Natural language planner
│   ├── BudgetSimulatorModal.tsx # What-if simulator
│   ├── TransactionsScreen.tsx  # Transaction list
│   ├── GoalsScreen.tsx         # Savings goals
│   ├── LimitsScreen.tsx        # Budget limits
│   ├── SubscriptionsScreen.tsx # Subscriptions
│   ├── RecurringScreen.tsx     # Recurring payments
│   ├── AnalyticsScreen.tsx     # Charts & analytics
│   └── ...
├── context/
│   └── AppContext.tsx          # Global state management
├── hooks/
│   ├── useSmartNotifications.ts
│   └── useCurrency.ts
├── lib/
│   ├── storage.ts              # Local storage utilities
│   ├── exportData.ts           # Data export functions
│   └── constants.ts            # App constants
└── types/
    └── index.ts                # TypeScript types

supabase/
└── functions/
    ├── ai-copilot/             # AI analysis endpoint
    ├── finance-planner/        # Natural language planning
    ├── telegram-bot/           # Telegram integration
    ├── telegram-daily-summary/ # Daily summary sender
    ├── scan-receipt/           # Receipt OCR
    └── parse-voice/            # Voice command parsing
```

---

## 🔐 Security Features

- Row Level Security (RLS) on all tables
- No sensitive data in client code
- Secure API key management
- JWT authentication support

---

## 🌍 Localization

Supported languages:
- 🇺🇿 Uzbek (O'zbekcha)
- 🇷🇺 Russian (Русский)
- 🇬🇧 English

---

## 📲 Publishing to App Stores

### Google Play Store (Android)

#### Prerequisites
1. Google Play Console account ($25 one-time fee)
2. Android signing key (keystore)
3. App icons and screenshots

#### Steps

1. **Build the Android app:**
```bash
npm run build
npx cap sync android
npx cap open android
```

2. **In Android Studio:**
   - Build → Generate Signed Bundle/APK
   - Choose Android App Bundle (.aab)
   - Create or use existing keystore
   - Select release build variant

3. **Prepare Store Listing:**
   - App title: "MonEX - AI Financial Assistant"
   - Short description (80 chars)
   - Full description (4000 chars)
   - Screenshots: Phone (2+), Tablet (optional)
   - Feature graphic: 1024x500px
   - App icon: 512x512px

4. **Upload to Play Console:**
   - Create new app
   - Complete content rating questionnaire
   - Set up pricing (Free)
   - Upload .aab file to Production track
   - Submit for review

5. **Required Policies:**
   - Privacy Policy URL
   - Data Safety declaration
   - Content rating

### Apple App Store (iOS)

#### Prerequisites
1. Apple Developer account ($99/year)
2. Mac with Xcode
3. App Store Connect access

#### Steps

1. **Build the iOS app:**
```bash
npm run build
npx cap sync ios
npx cap open ios
```

2. **In Xcode:**
   - Select "Any iOS Device" as target
   - Product → Archive
   - Distribute App → App Store Connect

3. **Configure in App Store Connect:**
   - Create new app
   - Set Bundle ID (same as in Xcode)
   - App Information:
     - Name: "MonEX"
     - Subtitle: "AI Financial Assistant"
     - Category: Finance

4. **Prepare Assets:**
   - Screenshots for each device size:
     - 6.7" (iPhone 14 Pro Max)
     - 6.5" (iPhone 11 Pro Max)
     - 5.5" (iPhone 8 Plus)
     - iPad Pro 12.9"
   - App Preview videos (optional)
   - App Icon: 1024x1024px (no alpha)

5. **Submit for Review:**
   - Complete App Privacy questionnaire
   - Add Privacy Policy URL
   - Submit build for review

6. **Review Process:**
   - Usually takes 24-48 hours
   - May ask for demo account
   - Respond to any issues promptly

---

## 📊 Database Schema

### telegram_transactions
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| telegram_user_id | BIGINT | Telegram user ID |
| amount | NUMERIC | Transaction amount |
| type | VARCHAR | "expense" or "income" |
| category_id | VARCHAR | Category identifier |
| description | TEXT | Transaction note |
| currency | VARCHAR | Currency code |
| created_at | TIMESTAMP | Creation time |

---

## 🔧 Configuration

### Environment Variables
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key

### Secrets (Edge Functions)
- `TELEGRAM_BOT_TOKEN` - Telegram Bot API token
- `LOVABLE_API_KEY` - Auto-configured for AI features

---

## 🚀 Getting Started

### Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Mobile Development
```bash
# Add platforms
npx cap add android
npx cap add ios

# Sync web code
npx cap sync

# Open in IDE
npx cap open android  # Android Studio
npx cap open ios      # Xcode
```

---

## 📈 Analytics & Metrics

The app tracks:
- Daily/weekly/monthly spending
- Category distribution
- Spending trends
- Goal progress
- Budget limit usage

---

## 🤝 Support & Contact

For questions or support:
- Create an issue in the repository
- Contact via Telegram bot

---

## 📄 License

© 2024 MonEX. All rights reserved.

---

## 🔄 Version History

### v1.0.0 (Current)
- ✅ PATH A: AI Financial Copilot
- ✅ PATH B: Telegram Banking OS
- ✅ PATH C: Natural Language Finance
- ✅ Budget Simulator
- ✅ Daily Telegram Summaries
- ✅ Multi-language support
- ✅ Dark/Light themes
- ✅ Receipt scanning
- ✅ Voice input

### Roadmap
- Push notifications
- Bank account linking
- Investment tracking
- Credit score monitoring
- Family budget sharing
