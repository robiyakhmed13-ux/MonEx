import React, { useState, useMemo, memo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { formatCurrency } from "@/lib/exportData";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";

export const ReportsScreen = memo(() => {
  const { t, lang, setActiveScreen, currency, transactions, catLabel, getCat, allCats } = useApp();
  const [period, setPeriod] = useState<"month" | "year">("month");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const reportRef = useRef<HTMLDivElement>(null);

  const months = lang === "uz" 
    ? ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"]
    : lang === "ru"
    ? ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"]
    : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const txDate = new Date(tx.date);
      if (period === "month") {
        return txDate.getMonth() === selectedMonth && txDate.getFullYear() === selectedYear;
      } else {
        return txDate.getFullYear() === selectedYear;
      }
    });
  }, [transactions, period, selectedMonth, selectedYear]);

  const stats = useMemo(() => {
    const income = filteredTransactions.filter(tx => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0);
    const expenses = filteredTransactions.filter(tx => tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const netSavings = income - expenses;
    const savingsRate = income > 0 ? (netSavings / income) * 100 : 0;
    
    return { income, expenses, netSavings, savingsRate };
  }, [filteredTransactions]);

  const categoryBreakdown = useMemo(() => {
    const breakdown = new Map<string, number>();
    filteredTransactions.filter(tx => tx.amount < 0).forEach(tx => {
      const current = breakdown.get(tx.categoryId) || 0;
      breakdown.set(tx.categoryId, current + Math.abs(tx.amount));
    });
    
    const total = stats.expenses;
    return [...breakdown.entries()]
      .map(([categoryId, amount]) => ({
        categoryId,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
        cat: getCat(categoryId),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions, stats.expenses, getCat]);

  const dailySpending = useMemo(() => {
    const days = new Map<string, { income: number; expense: number }>();
    
    filteredTransactions.forEach(tx => {
      const day = tx.date.slice(-2);
      const current = days.get(day) || { income: 0, expense: 0 };
      if (tx.amount > 0) {
        current.income += tx.amount;
      } else {
        current.expense += Math.abs(tx.amount);
      }
      days.set(day, current);
    });
    
    return [...days.entries()]
      .map(([day, data]) => ({ day, ...data }))
      .sort((a, b) => Number(a.day) - Number(b.day));
  }, [filteredTransactions]);

  const monthlyTrend = useMemo(() => {
    if (period !== "year") return [];
    
    const monthly = new Map<number, { income: number; expense: number }>();
    
    transactions
      .filter(tx => new Date(tx.date).getFullYear() === selectedYear)
      .forEach(tx => {
        const month = new Date(tx.date).getMonth();
        const current = monthly.get(month) || { income: 0, expense: 0 };
        if (tx.amount > 0) {
          current.income += tx.amount;
        } else {
          current.expense += Math.abs(tx.amount);
        }
        monthly.set(month, current);
      });
    
    return months.map((name, i) => ({
      month: name.slice(0, 3),
      ...(monthly.get(i) || { income: 0, expense: 0 }),
    }));
  }, [transactions, period, selectedYear, months]);

  const COLORS = ["#FF6B6B", "#4DABF7", "#51CF66", "#FAB005", "#BE4BDB", "#868E96", "#FF8787", "#74C0FC"];

  const handleExportPDF = async () => {
    // Simple HTML to PDF using print
    const printContent = reportRef.current;
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const title = period === "month" 
      ? `${months[selectedMonth]} ${selectedYear}` 
      : `${selectedYear}`;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Hamyon - ${title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { color: #333; border-bottom: 2px solid #007AFF; padding-bottom: 10px; }
          h2 { color: #555; margin-top: 30px; }
          .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0; }
          .stat-box { padding: 20px; border-radius: 12px; background: #f5f5f5; }
          .stat-label { font-size: 14px; color: #666; }
          .stat-value { font-size: 24px; font-weight: bold; margin-top: 5px; }
          .income { color: #51CF66; }
          .expense { color: #FF6B6B; }
          .category-list { margin: 20px 0; }
          .category-item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee; }
          .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>📊 Hamyon - ${lang === "uz" ? "Moliyaviy Hisobot" : lang === "ru" ? "Финансовый Отчёт" : "Financial Report"}</h1>
        <p>${title}</p>
        
        <div class="stats">
          <div class="stat-box">
            <div class="stat-label">${lang === "uz" ? "Daromad" : lang === "ru" ? "Доход" : "Income"}</div>
            <div class="stat-value income">+${formatCurrency(stats.income, currency)}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">${lang === "uz" ? "Xarajat" : lang === "ru" ? "Расходы" : "Expenses"}</div>
            <div class="stat-value expense">-${formatCurrency(stats.expenses, currency)}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">${lang === "uz" ? "Sof tejash" : lang === "ru" ? "Чистые сбережения" : "Net Savings"}</div>
            <div class="stat-value" style="color: ${stats.netSavings >= 0 ? '#51CF66' : '#FF6B6B'}">${stats.netSavings >= 0 ? '+' : ''}${formatCurrency(stats.netSavings, currency)}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">${lang === "uz" ? "Tejash foizi" : lang === "ru" ? "Процент сбережений" : "Savings Rate"}</div>
            <div class="stat-value">${stats.savingsRate.toFixed(1)}%</div>
          </div>
        </div>
        
        <h2>${lang === "uz" ? "Kategoriyalar bo'yicha" : lang === "ru" ? "По категориям" : "By Category"}</h2>
        <div class="category-list">
          ${categoryBreakdown.map(cat => `
            <div class="category-item">
              <span>${cat.cat.emoji} ${catLabel(cat.cat)}</span>
              <span><strong>${formatCurrency(cat.amount, currency)}</strong> (${cat.percentage.toFixed(1)}%)</span>
            </div>
          `).join('')}
        </div>
        
        <div class="footer">
          ${lang === "uz" ? "Hamyon - Moliyaviy yordamchi" : lang === "ru" ? "Hamyon - Финансовый помощник" : "Hamyon - Financial Assistant"} • ${new Date().toLocaleDateString()}
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  };

  const labels = {
    title: lang === "uz" ? "Hisobotlar" : lang === "ru" ? "Отчёты" : "Reports",
    month: lang === "uz" ? "Oylik" : lang === "ru" ? "Месяц" : "Monthly",
    year: lang === "uz" ? "Yillik" : lang === "ru" ? "Год" : "Yearly",
    income: lang === "uz" ? "Daromad" : lang === "ru" ? "Доход" : "Income",
    expenses: lang === "uz" ? "Xarajatlar" : lang === "ru" ? "Расходы" : "Expenses",
    netSavings: lang === "uz" ? "Sof tejash" : lang === "ru" ? "Чистые сбережения" : "Net Savings",
    savingsRate: lang === "uz" ? "Tejash foizi" : lang === "ru" ? "% сбережений" : "Savings Rate",
    byCategory: lang === "uz" ? "Kategoriyalar" : lang === "ru" ? "По категориям" : "By Category",
    exportPDF: lang === "uz" ? "PDF yuklab olish" : lang === "ru" ? "Скачать PDF" : "Export PDF",
    noData: lang === "uz" ? "Ma'lumot yo'q" : lang === "ru" ? "Нет данных" : "No data",
    trend: lang === "uz" ? "Trend" : lang === "ru" ? "Тренд" : "Trend",
  };

  return (
    <div className="screen-container" ref={reportRef}>
      {/* Header - Large Title */}
      <div className="screen-header">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveScreen("home")}
            className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center active:opacity-80 transition-opacity"
          >
            ←
          </button>
          <div className="flex-1">
            <h1 className="text-large-title text-foreground">{labels.title}</h1>
          </div>
          <button
            onClick={handleExportPDF}
            className="btn-secondary text-body-medium"
          >
            📄 PDF
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-3 mb-section">
        {[
          { key: "month", label: labels.month },
          { key: "year", label: labels.year },
        ].map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key as "month" | "year")}
            className={`flex-1 py-3 rounded-xl text-body-medium transition-opacity active:opacity-80 ${
              period === p.key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Date Selector */}
      <div className="flex gap-2 mb-section overflow-x-auto pb-2 no-scrollbar">
        {period === "month" ? (
          months.map((m, i) => (
            <button
              key={i}
              onClick={() => setSelectedMonth(i)}
              className={`px-4 py-2 rounded-xl whitespace-nowrap text-body transition-opacity active:opacity-80 ${
                selectedMonth === i ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              {m.slice(0, 3)}
            </button>
          ))
        ) : (
          [selectedYear - 1, selectedYear, selectedYear + 1].map(y => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`px-6 py-2 rounded-xl text-body transition-opacity active:opacity-80 ${
                selectedYear === y ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              {y}
            </button>
          ))
        )}
      </div>

      {/* Stats Overview - Info Cards */}
      <div className="grid grid-cols-2 gap-3 mb-section">
        <div className="card-info">
          <p className="text-caption">{labels.income}</p>
          <p className="card-info-number text-income">+{formatCurrency(stats.income, currency)}</p>
        </div>
        
        <div className="card-info">
          <p className="text-caption">{labels.expenses}</p>
          <p className="card-info-number text-expense">-{formatCurrency(stats.expenses, currency)}</p>
        </div>
        
        <div className="card-info">
          <p className="text-caption">{labels.netSavings}</p>
          <p className={`card-info-number ${stats.netSavings >= 0 ? "text-income" : "text-expense"}`}>
            {stats.netSavings >= 0 ? "+" : ""}{formatCurrency(stats.netSavings, currency)}
          </p>
        </div>
        
        <div className="card-info">
          <p className="text-caption">{labels.savingsRate}</p>
          <p className={`card-info-number ${stats.savingsRate >= 20 ? "text-income" : stats.savingsRate >= 0 ? "text-foreground" : "text-expense"}`}>
            {stats.savingsRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Spending Chart */}
      {(period === "month" ? dailySpending.length > 0 : monthlyTrend.length > 0) && (
        <div className="card-elevated mb-section">
          <h3 className="text-title text-foreground mb-4">{labels.trend}</h3>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              {period === "month" ? (
                <AreaChart data={dailySpending}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <YAxis hide />
                  <Area type="monotone" dataKey="expense" stroke="hsl(var(--expense))" fill="hsl(var(--expense) / 0.1)" strokeWidth={2} />
                  <Area type="monotone" dataKey="income" stroke="hsl(var(--income))" fill="hsl(var(--income) / 0.1)" strokeWidth={2} />
                </AreaChart>
              ) : (
                <BarChart data={monthlyTrend}>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <YAxis hide />
                  <Bar dataKey="income" fill="hsl(var(--income))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill="hsl(var(--expense))" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      {categoryBreakdown.length > 0 && (
        <div className="card-elevated mb-section">
          <h3 className="text-title text-foreground mb-4">{labels.byCategory}</h3>
          
          {/* Pie Chart */}
          <div className="h-[180px] mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryBreakdown.slice(0, 6)}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="amount"
                >
                  {categoryBreakdown.slice(0, 6).map((entry, index) => (
                    <Cell key={entry.categoryId} fill={entry.cat.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Category List */}
          <div className="space-y-3">
            {categoryBreakdown.slice(0, 8).map((cat, i) => (
              <div
                key={cat.categoryId}
                className="flex items-center gap-3"
              >
                <div 
                  className="category-icon"
                  style={{ backgroundColor: (cat.cat.color || COLORS[i]) + "20" }}
                >
                  {cat.cat.emoji}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-body-medium text-foreground">{catLabel(cat.cat)}</span>
                    <span className="text-body-medium text-foreground">{formatCurrency(cat.amount, currency)}</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ 
                        width: `${cat.percentage}%`,
                        backgroundColor: cat.cat.color || COLORS[i]
                      }}
                    />
                  </div>
                </div>
                <span className="text-caption w-10 text-right">{cat.percentage.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Data */}
      {filteredTransactions.length === 0 && (
        <div className="card-insight justify-center py-12">
          <p className="card-insight-text text-muted-foreground">📊 {labels.noData}</p>
        </div>
      )}
    </div>
  );
});

ReportsScreen.displayName = "ReportsScreen";

export default ReportsScreen;
