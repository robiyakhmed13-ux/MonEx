# MonEX - Complete Application Guideline

> **Personal Finance Management App with AI-Powered Insights**

---

## Table of Contents

1. [Overview](#overview)
2. [Features Guide](#features-guide)
3. [Design System](#design-system)
4. [Technical Architecture](#technical-architecture)
5. [Screen-by-Screen Guide](#screen-by-screen-guide)
6. [Publishing Guide](#publishing-guide)
7. [Customization](#customization)
8. [Troubleshooting](#troubleshooting)

---

## Overview

MonEX is a comprehensive personal finance management application built with modern technologies:

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Edge Functions, Real-time)
- **Mobile**: Capacitor for native iOS/Android builds
- **PWA**: Progressive Web App for installable web experience
- **AI**: Integrated AI copilot for financial insights

### Key Capabilities

| Feature | Description |
|---------|-------------|
| Transaction Tracking | Quick add, voice input, receipt scanning |
| Budget Management | Category limits with visual progress |
| Goals & Savings | Set and track financial goals |
| AI Insights | Behavioral analysis and predictions |
| Multi-language | Uzbek, Russian, English support |
| Dark/Light Mode | Automatic theme switching |
| Telegram Bot | Chat-native expense tracking |

---

## Features Guide

### 1. Transaction Management

#### Quick Add
- Tap category icons on home screen for instant expense logging
- Long-press to customize amounts
- Transactions are automatically dated and categorized

#### Voice Input
- Tap microphone icon in header
- Speak naturally: "Spent 50,000 on coffee"
- AI parses amount, category, and description

#### Receipt Scanning
- Upload or capture receipt photos
- AI extracts total, date, and items
- Auto-categorizes based on merchant

#### Manual Entry
- Full form with amount, category, date, description
- Support for both expense and income types
- Optional time and notes

### 2. AI Financial Copilot

Located in the **AI** tab, provides:

#### Features Section
- **AI Copilot**: Real-time spending analysis, stress detection, predictive warnings
- **Finance Planner**: Natural language financial planning ("I want to save $500 for vacation")
- **Budget Simulator**: "What-if" scenarios for spending decisions

#### Tools Section
- **Debt Assessment**: Evaluate and prioritize debt repayment
- **Cash Flow**: Income vs expense trends over time
- **Net Worth**: Track total assets and liabilities
- **Investments**: Portfolio overview (when integrated)
- **Debt Payoff**: Calculator for debt elimination strategies

### 3. Budget Limits

- Set monthly spending caps per category
- Visual progress bars with color warnings
- Automatic notifications when approaching/exceeding limits
- Available on Home screen and dedicated Limits screen

### 4. Savings Goals

- Create named goals with target amounts
- Choose from 10 goal icons
- Track progress with deposits
- View remaining amount and percentage

### 5. Analytics & Reports

- **Daily/Weekly/Monthly** spending charts
- **Category breakdown** pie charts
- **Trend analysis** over time
- Export to CSV/PDF

### 6. Telegram Integration

Connect your Telegram account for:
- Quick expense entry via chat
- Daily spending summaries
- Voice notes for transactions
- Commands: `/add`, `/stats`, `/balance`, `/help`

### 7. Additional Features

| Feature | Location | Description |
|---------|----------|-------------|
| Subscriptions | More → Subscriptions | Track recurring payments |
| Recurring | More → Recurring | Manage scheduled transactions |
| Accounts | More → Accounts | Multiple account tracking |
| Bill Split | More → Bill Split | Split expenses with friends |
| Envelopes | More → Envelopes | Envelope budgeting system |

---

## Design System

### Color Palette

```css
/* Primary Colors */
--primary: 220 83% 53%          /* Main blue */
--primary-foreground: 0 0% 100%  /* White text on primary */

/* Background */
--background: 220 15% 7%         /* Dark mode bg */
--foreground: 0 0% 95%           /* Light text */

/* Semantic Colors */
--destructive: 0 84% 60%         /* Red for expenses/errors */
--income: 142 76% 36%            /* Green for income */
--warning: 38 92% 50%            /* Orange for warnings */

/* Surface Colors */
--card: 220 15% 11%              /* Card backgrounds */
--secondary: 220 12% 15%         /* Secondary surfaces */
--muted: 220 10% 40%             /* Muted text */
```

### Typography

| Class | Usage | Size |
|-------|-------|------|
| `.text-display` | Large numbers | 36px, bold |
| `.text-large-title` | Screen titles | 28px, bold |
| `.text-title` | Card titles | 20px, semibold |
| `.text-body-medium` | Primary text | 16px, medium |
| `.text-body` | Body text | 16px, normal |
| `.text-caption` | Secondary info | 13px, normal |

### Components

#### Cards
```css
.card-info       /* Primary info cards */
.card-elevated   /* Elevated action cards */
.card-insight    /* Insight/notification cards */
```

#### Buttons
```css
.btn-primary     /* Main action buttons */
.btn-secondary   /* Secondary actions */
.btn-ghost       /* Subtle buttons */
```

#### Progress
```css
.progress-bar         /* Track background */
.progress-fill        /* Normal progress */
.progress-fill-danger /* Over-budget state */
.progress-fill-success/* Goal progress */
```

---

## Technical Architecture

### Project Structure

```
src/
├── components/          # UI components
│   ├── ui/             # Shadcn/UI base components
│   ├── HomeScreen.tsx  # Main dashboard
│   ├── AIScreen.tsx    # AI features hub
│   └── ...
├── context/
│   └── AppContext.tsx  # Global state management
├── hooks/
│   ├── useAuth.ts      # Authentication
│   ├── useCurrency.ts  # Currency formatting
│   └── usePullToRefresh.ts  # Mobile refresh
├── lib/
│   ├── storage.ts      # Local storage utilities
│   ├── constants.ts    # App constants
│   └── utils.ts        # Helper functions
├── integrations/
│   └── supabase/       # Database client
└── pages/
    ├── Index.tsx       # Main app entry
    └── Auth.tsx        # Authentication page

supabase/
└── functions/          # Edge Functions
    ├── ai-copilot/     # AI analysis
    ├── scan-receipt/   # Receipt OCR
    ├── parse-voice/    # Voice parsing
    └── telegram-webhook/  # Bot webhook
```

### Database Schema

```sql
-- Transactions
transactions (
  id UUID PRIMARY KEY,
  user_id UUID,
  type TEXT,           -- 'expense' | 'income'
  amount NUMERIC,
  category_id TEXT,
  description TEXT,
  date DATE,
  source TEXT          -- 'manual' | 'voice' | 'telegram'
)

-- Goals
goals (
  id UUID PRIMARY KEY,
  user_id UUID,
  name TEXT,
  target NUMERIC,
  current NUMERIC,
  emoji TEXT
)

-- Limits
limits (
  id UUID PRIMARY KEY,
  user_id UUID,
  category_id TEXT,
  amount NUMERIC,
  period TEXT          -- 'monthly' | 'weekly'
)

-- Profiles
profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  telegram_id BIGINT,
  avatar_url TEXT
)
```

### State Management

The app uses React Context for global state:

```typescript
const AppContext = {
  // User
  user, tgUser, lang,
  
  // Data
  transactions, goals, limits, quickAdds,
  
  // Computed
  balance, todayExp, todayInc, weekSpend, monthSpend,
  
  // Actions
  addTransaction, updateTransaction, deleteTransaction,
  addGoal, updateGoal, deleteGoal, depositToGoal,
  addLimit, updateLimit, deleteLimit,
  
  // Navigation
  activeScreen, setActiveScreen,
  
  // Utilities
  t, formatAmount, getCat, catLabel, showToast
}
```

---

## Screen-by-Screen Guide

### Home Screen (`/`)

**Purpose**: Dashboard with balance, today's summary, and quick actions

**Components**:
- User greeting with avatar
- Balance card (total available)
- Today's expenses/income summary
- Week spending with trend indicator
- AI insights widget
- Quick action buttons
- Budget progress preview
- Quick add category chips

**Interactions**:
- Pull down to refresh data
- Tap sync icon to force refresh
- Tap categories for quick expenses

### AI Screen (`/ai`)

**Purpose**: Access all AI-powered features and financial tools

**Layout**:
- Grid of AI feature cards
- Grid of financial tool cards
- Each card opens respective modal/screen

### Transactions Screen (`/transactions`)

**Purpose**: Full transaction history with filters

**Features**:
- Filter by: All, Expense, Income, Today, Week, Month
- Edit/delete transactions
- Sorted by date (newest first)

### Goals Screen (`/goals`)

**Purpose**: Create and track savings goals

**Features**:
- Goal cards with progress
- Deposit functionality
- Icon selection
- Delete confirmation

### Limits Screen (`/limits`)

**Purpose**: Set category spending limits

**Features**:
- Category dropdown selection
- Amount input
- Visual progress bars
- Edit/delete limits

### Settings Screen (`/settings`)

**Purpose**: App configuration

**Options**:
- Language selection
- Theme toggle
- Telegram linking
- Data export
- Account management

---

## Publishing Guide

### Prerequisites

- Node.js 18+ installed
- Android Studio (for Android builds)
- Xcode (for iOS builds, Mac required)
- Google Play Developer account ($25 one-time)
- Apple Developer account ($99/year for iOS)

### PWA Installation

The app is already PWA-ready:

1. **Mobile browsers**: Visit app URL → Share → "Add to Home Screen"
2. **Desktop Chrome**: Click install icon in address bar
3. **Works offline** after first load

### Android Build (Google Play)

#### Step 1: Clone and Setup

```bash
# Clone from GitHub
git clone <your-repo-url>
cd monex

# Install dependencies
npm install

# Create .env file
echo "VITE_SUPABASE_URL=your_url" >> .env
echo "VITE_SUPABASE_PUBLISHABLE_KEY=your_key" >> .env
```

#### Step 2: Initialize Capacitor

```bash
# If not already initialized
npx cap init MonEX app.lovable.monex

# Add Android platform
npx cap add android

# Build web assets
npm run build

# Sync to native project
npx cap sync android
```

#### Step 3: Android Studio Setup

```bash
# Open in Android Studio
npx cap open android
```

In Android Studio:
1. Wait for Gradle sync to complete
2. Update `app/build.gradle`:
   ```gradle
   android {
     compileSdkVersion 34
     defaultConfig {
       minSdkVersion 22
       targetSdkVersion 34
       versionCode 1
       versionName "1.0.0"
     }
   }
   ```

#### Step 4: Create Signing Key

```bash
keytool -genkey -v -keystore monex-release.keystore \
  -alias monex -keyalg RSA -keysize 2048 -validity 10000
```

Create `android/keystore.properties`:
```properties
storeFile=../monex-release.keystore
storePassword=your_password
keyAlias=monex
keyPassword=your_password
```

#### Step 5: Build Release AAB

In Android Studio:
1. Build → Generate Signed Bundle/APK
2. Select Android App Bundle
3. Choose your keystore
4. Build → Release

#### Step 6: Google Play Console

1. Go to [play.google.com/console](https://play.google.com/console)
2. Create new app
3. Fill store listing:
   - Title: MonEX - Personal Finance Tracker
   - Short description: Track expenses, set budgets, achieve financial goals
   - Full description: (see template below)
4. Upload screenshots (phone, tablet)
5. Upload AAB file to Production track
6. Complete content rating questionnaire
7. Submit for review

**Store Description Template**:
```
MonEX - Your AI-Powered Personal Finance Companion

💰 TRACK EVERYTHING
- Quick expense entry with one tap
- Voice input for hands-free tracking
- Receipt scanning with AI
- Multi-currency support

📊 SMART INSIGHTS
- AI-powered spending analysis
- Stress spending detection
- Predictive budget warnings
- Weekly/monthly reports

🎯 ACHIEVE GOALS
- Set savings targets
- Track progress visually
- Celebrate milestones

🔒 SECURE & PRIVATE
- Bank-level encryption
- Local data option
- No ads, no data selling

Available in: English, Russian, Uzbek
```

### iOS Build (App Store)

#### Step 1: Add iOS Platform

```bash
npx cap add ios
npx cap sync ios
npx cap open ios
```

#### Step 2: Xcode Configuration

1. Set Bundle Identifier: `app.lovable.monex`
2. Set Team (Apple Developer account)
3. Configure signing certificates
4. Update `Info.plist`:
   - Privacy descriptions for camera, microphone
   - App Transport Security settings

#### Step 3: Build Archive

1. Select "Any iOS Device" as target
2. Product → Archive
3. Distribute App → App Store Connect
4. Upload to App Store

#### Step 4: App Store Connect

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Create new app
3. Fill metadata (similar to Play Store)
4. Upload screenshots (all device sizes)
5. Submit for review

---

## Customization

### Adding New Categories

Edit `src/lib/constants.ts`:

```typescript
export const CATEGORIES = [
  // Add new category
  { 
    id: "gym", 
    en: "Gym", 
    uz: "Zal", 
    ru: "Спортзал", 
    color: "#FF6B6B", 
    icon: "dumbbell" 
  },
  // ...existing categories
];
```

Then add icon mapping in `src/components/CategoryIcon.tsx`:

```typescript
import { Dumbbell } from "lucide-react";

const iconMap = {
  // ...existing icons
  dumbbell: Dumbbell,
};
```

### Adding New Languages

1. Add translations to `src/lib/constants.ts`:
   ```typescript
   export const STRINGS = {
     en: { /* existing */ },
     uz: { /* existing */ },
     ru: { /* existing */ },
     es: { 
       hello: "Hola",
       balance: "Saldo",
       // ... all strings
     }
   };
   ```

2. Add to language selector in `SettingsScreen.tsx`

### Changing Theme Colors

Edit `src/index.css`:

```css
:root {
  --primary: 220 83% 53%;  /* Change to your brand color */
}
```

Use HSL format for all colors.

---

## Troubleshooting

### Common Issues

#### "useApp must be used within AppProvider"
- Ensure components are wrapped by `<AppProvider>` in `App.tsx`
- Check for circular imports
- Try clearing browser cache

#### Supabase Connection Failed
- Verify `.env` variables are set correctly
- Check Supabase project is active
- Verify RLS policies allow access

#### Android Build Fails
```bash
# Clear caches
cd android && ./gradlew clean
rm -rf node_modules/.cache
npm run build
npx cap sync android
```

#### iOS Build Fails
```bash
cd ios && pod install --repo-update
npx cap sync ios
```

### Performance Tips

1. **Reduce re-renders**: Use `useMemo` and `useCallback`
2. **Lazy load screens**: Already implemented with dynamic imports
3. **Optimize images**: Use WebP format
4. **Cache API calls**: React Query handles this

### Debug Mode

Enable debug logging:
```typescript
// In browser console
localStorage.setItem('debug', 'true');
```

### Support

- **Documentation**: This file
- **GitHub Issues**: Report bugs
- **Telegram**: @MonEXSupport

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025 | Initial release |
| 1.1.0 | 2025 | Added AI copilot, voice input |
| 1.2.0 | 2025 | PWA support, pull-to-refresh |

---

**MonEX** - Take control of your finances 💰
