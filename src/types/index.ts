export interface Transaction {
  id: string;
  type: "expense" | "income" | "debt" | "transfer";
  amount: number;
  description: string;
  categoryId: string;
  date: string;
  time?: string;
  source?: string;
  remote?: boolean;
  recurringId?: string;
  accountId?: string;
  toAccountId?: string; // For transfers
}

export interface Limit {
  id: string;
  categoryId: string;
  amount: number;
  remote?: boolean;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
  emoji: string;
  deadline?: string;
  remote?: boolean;
}

export interface RecurringTransaction {
  id: string;
  type: "expense" | "income";
  amount: number;
  description: string;
  categoryId: string;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  nextDate: string;
  active: boolean;
  emoji?: string;
  accountId?: string;
}

export interface QuickAddPreset {
  id: string;
  emoji: string;
  categoryId: string;
  amount: number;
  label?: string;
}

export interface UserPreferences {
  theme: "light" | "dark" | "system";
  currency: string;
  quickAdds: QuickAddPreset[];
  onboardingComplete: boolean;
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

// Multi-account support
export interface Account {
  id: string;
  name: string;
  type: "bank" | "wallet" | "cash" | "card" | "savings";
  balance: number;
  currency: string;
  emoji: string;
  color: string;
  isDefault?: boolean;
}

export interface Transfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  description?: string;
}

// Debt Assessment
export interface DebtItem {
  id: string;
  name: string;
  totalAmount: number;
  remainingAmount: number;
  monthlyPayment: number;
  interestRate: number;
  startDate: string;
  endDate?: string;
  type: "loan" | "credit_card" | "mortgage" | "personal";
  lender: string;
}

export interface DebtAssessment {
  monthlyIncome: number;
  monthlyExpenses: number;
  existingDebts: DebtItem[];
  newLoanAmount: number;
  newLoanMonthlyPayment: number;
  debtToIncomeRatio: number;
  canAfford: boolean;
  recommendations: string[];
}

// Financial Reports
export interface MonthlyReport {
  month: string;
  year: number;
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  categoryBreakdown: Array<{ categoryId: string; amount: number; percentage: number }>;
  dailySpending: Array<{ date: string; amount: number }>;
  topExpenses: Transaction[];
}

// Multi-Currency Support
export interface Currency {
  code: string;
  symbol: string;
  name: string;
  rate: number; // Rate to base currency (UZS)
}

export interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  lastUpdated: string;
}

// Bill Splitting
export interface BillSplit {
  id: string;
  title: string;
  totalAmount: number;
  currency: string;
  date: string;
  paidBy: string;
  participants: BillParticipant[];
  settled: boolean;
}

export interface BillParticipant {
  id: string;
  name: string;
  amount: number;
  paid: boolean;
}

// Subscription Management
export interface Subscription {
  id: string;
  name: string;
  amount: number;
  currency: string;
  frequency: "weekly" | "monthly" | "yearly";
  nextBillingDate: string;
  category: string;
  emoji: string;
  active: boolean;
  reminderDays: number; // Days before to remind
  autoRenew: boolean;
}

// Net Worth Tracking
export interface NetWorthSnapshot {
  date: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  breakdown: {
    accounts: Record<string, number>;
    investments: Record<string, number>;
    debts: Record<string, number>;
  };
}

// Investment Tracking
export interface Investment {
  id: string;
  symbol: string;
  name: string;
  type: "stock" | "crypto" | "etf" | "mutual_fund";
  quantity: number;
  purchasePrice: number;
  purchaseDate: string;
  currentPrice?: number;
  currency: string;
}

export interface InvestmentPortfolio {
  investments: Investment[];
  totalValue: number;
  totalGain: number;
  totalGainPercent: number;
  lastUpdated: string;
}

// Budget Envelopes
export interface BudgetEnvelope {
  id: string;
  name: string;
  emoji: string;
  allocated: number;
  spent: number;
  categoryIds: string[];
  color: string;
  period: "weekly" | "monthly";
}

// Cash Flow Forecast
export interface CashFlowForecast {
  date: string;
  projectedBalance: number;
  inflows: number;
  outflows: number;
  events: CashFlowEvent[];
}

export interface CashFlowEvent {
  id: string;
  type: "income" | "expense" | "bill" | "subscription";
  name: string;
  amount: number;
  date: string;
}

// Debt Repayment Strategy
export interface DebtPayoffPlan {
  strategy: "snowball" | "avalanche";
  debts: DebtItem[];
  monthlyPayment: number;
  totalInterestSaved: number;
  payoffDate: string;
  schedule: DebtPaymentSchedule[];
}

export interface DebtPaymentSchedule {
  month: string;
  payments: Array<{
    debtId: string;
    payment: number;
    remaining: number;
  }>;
}

// Smart Notifications
export interface SmartNotification {
  id: string;
  type:
    | "budget_alert"
    | "bill_reminder"
    | "anomaly"
    | "goal_progress"
    | "debt_warning"
    | "subscription_reminder"
    | "investment_alert";
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  createdAt: string;
  read: boolean;
  actionType?: "view_limit" | "view_goal" | "view_transaction" | "view_debt" | "view_subscription" | "view_investment";
  actionData?: string;
}

export type ScreenType = 
  | "home" 
  | "transactions" 
  | "categories" 
  | "limits" 
  | "goals" 
  | "debts" 
  | "analytics" 
  | "recurring"
  | "settings"
  | "accounts"
  | "debt-assessment"
  | "reports"
  | "subscriptions"
  | "subscriptions-add"
  | "bill-split"
  | "net-worth"
  | "investments"
  | "envelopes"
  | "cash-flow"
  | "debt-payoff"
  | "more";
