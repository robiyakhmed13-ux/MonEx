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
  | "reports";
