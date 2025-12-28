import React, { memo, CSSProperties } from "react";
import {
  Banknote,
  Briefcase,
  Bus,
  Car,
  Coffee,
  CreditCard,
  Film,
  GraduationCap,
  Handshake,
  HeartPulse,
  Package,
  ShoppingCart,
  Utensils,
  Zap,
} from "lucide-react";

type Props = {
  categoryId: string;
  className?: string;
  style?: CSSProperties;
};

const iconMap: Record<string, React.ComponentType<{ className?: string; style?: CSSProperties }>> = {
  // Expense
  food: Utensils,
  restaurants: Utensils,
  coffee: Coffee,
  transport: Bus,
  taxi: Car,
  fuel: Zap,
  bills: Banknote,
  shopping: ShoppingCart,
  health: HeartPulse,
  education: GraduationCap,
  entertainment: Film,
  other: Package,

  // Income
  salary: Briefcase,
  freelance: Briefcase,
  bonus: Banknote,
  other_income: Banknote,

  // Debt
  borrowed: Handshake,
  lent: Handshake,
  loan_payment: Banknote,
  credit: CreditCard,
};

export const CategoryIcon = memo(({ categoryId, className, style }: Props) => {
  const Icon = iconMap[categoryId] || Package;
  return <Icon className={className} style={style} aria-hidden="true" />;
});

CategoryIcon.displayName = "CategoryIcon";
