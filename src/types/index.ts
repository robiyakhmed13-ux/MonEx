export interface Transaction {
  id: string;
  type: "expense" | "income" | "debt";
  amount: number;
  description: string;
  categoryId: string;
  date: string;
  time?: string;
  source?: string;
  remote?: boolean;
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
  remote?: boolean;
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

export type ScreenType = 
  | "home" 
  | "transactions" 
  | "categories" 
  | "limits" 
  | "goals" 
  | "debts" 
  | "analytics" 
  | "settings";
