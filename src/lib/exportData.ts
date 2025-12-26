import { Transaction } from "@/types";
import { Category, LangKey } from "@/lib/constants";

export interface ExportOptions {
  transactions: Transaction[];
  categories: { expense: Category[]; income: Category[]; debt: Category[] };
  lang: LangKey;
  currency: string;
  getCatLabel: (cat: Category) => string;
}

export const exportTransactionsCSV = ({ transactions, categories, lang, currency, getCatLabel }: ExportOptions): void => {
  const allCats = [...categories.expense, ...categories.income, ...categories.debt];
  
  const getCat = (id: string) => allCats.find(c => c.id === id) || { id, uz: id, ru: id, en: id, emoji: "❓", color: "#868E96" };
  
  // Headers
  const headers = lang === "uz" 
    ? ["Sana", "Vaqt", "Turi", "Kategoriya", "Tavsif", "Summa", "Valyuta"]
    : lang === "ru"
    ? ["Дата", "Время", "Тип", "Категория", "Описание", "Сумма", "Валюта"]
    : ["Date", "Time", "Type", "Category", "Description", "Amount", "Currency"];
  
  const typeLabels: Record<string, Record<LangKey, string>> = {
    expense: { uz: "Xarajat", ru: "Расход", en: "Expense" },
    income: { uz: "Daromad", ru: "Доход", en: "Income" },
    debt: { uz: "Qarz", ru: "Долг", en: "Debt" },
  };
  
  // Data rows
  const rows = transactions.map(tx => {
    const cat = getCat(tx.categoryId);
    return [
      tx.date,
      tx.time || "",
      typeLabels[tx.type]?.[lang] || tx.type,
      getCatLabel(cat),
      `"${(tx.description || "").replace(/"/g, '""')}"`,
      tx.amount.toString(),
      currency,
    ];
  });
  
  const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  
  // Add BOM for Excel UTF-8 compatibility
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  const fileName = `hamyon_transactions_${new Date().toISOString().slice(0, 10)}.csv`;
  
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Format currency based on selection
export const formatCurrency = (amount: number, currency: string): string => {
  const absAmount = Math.abs(amount);
  
  switch (currency) {
    case "UZS":
      return new Intl.NumberFormat("uz-UZ", { 
        maximumFractionDigits: 0 
      }).format(absAmount) + " UZS";
    case "USD":
      return new Intl.NumberFormat("en-US", { 
        style: "currency", 
        currency: "USD",
        maximumFractionDigits: 2 
      }).format(absAmount);
    case "RUB":
      return new Intl.NumberFormat("ru-RU", { 
        maximumFractionDigits: 0 
      }).format(absAmount) + " ₽";
    default:
      return absAmount.toLocaleString();
  }
};

export const CURRENCIES = [
  { code: "UZS", symbol: "UZS", name: "O'zbek so'mi", flag: "🇺🇿" },
  { code: "USD", symbol: "$", name: "US Dollar", flag: "🇺🇸" },
  { code: "RUB", symbol: "₽", name: "Российский рубль", flag: "🇷🇺" },
];
