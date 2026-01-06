import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { ArrowLeft, TrendingDown, TrendingUp } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

export const AnalyticsScreen: React.FC = () => {
  const { t, transactions, getCat, catLabel, lang, setActiveScreen } = useApp();
  
  // Calculate weekly data (last 7 days)
  const weeklyData = useMemo(() => {
    const days: Record<string, { date: string; expenses: number; income: number; label: string }> = {};
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayNames = lang === 'ru' 
        ? ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
        : lang === 'uz'
        ? ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh']
        : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      days[key] = { date: key, expenses: 0, income: 0, label: dayNames[d.getDay()] };
    }
    
    transactions.forEach((tx) => {
      if (days[tx.date]) {
        if (tx.amount < 0) {
          days[tx.date].expenses += Math.abs(tx.amount);
        } else {
          days[tx.date].income += tx.amount;
        }
      }
    });
    
    return Object.values(days);
  }, [transactions, lang]);
  
  // Monthly data (last 4 weeks)
  const monthlyData = useMemo(() => {
    const weeks: Array<{ week: string; expenses: number; income: number }> = [];
    const today = new Date();
    
    for (let w = 3; w >= 0; w--) {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - (w * 7) - 6);
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() - (w * 7));
      
      const startStr = weekStart.toISOString().slice(0, 10);
      const endStr = weekEnd.toISOString().slice(0, 10);
      
      let expenses = 0;
      let income = 0;
      
      transactions.forEach((tx) => {
        if (tx.date >= startStr && tx.date <= endStr) {
          if (tx.amount < 0) expenses += Math.abs(tx.amount);
          else income += tx.amount;
        }
      });
      
      const weekLabel = lang === 'ru' ? `Нед ${4 - w}` : lang === 'uz' ? `Hafta ${4 - w}` : `Week ${4 - w}`;
      weeks.push({ week: weekLabel, expenses, income });
    }
    
    return weeks;
  }, [transactions, lang]);
  
  // Category breakdown
  const categoryData = useMemo(() => {
    const cats: Record<string, { id: string; value: number; color: string }> = {};
    const thisMonth = new Date().toISOString().slice(0, 7);
    
    transactions.forEach((tx) => {
      if (tx.amount < 0 && tx.date.startsWith(thisMonth)) {
        if (!cats[tx.categoryId]) {
          const cat = getCat(tx.categoryId);
          cats[tx.categoryId] = { id: tx.categoryId, value: 0, color: cat.color };
        }
        cats[tx.categoryId].value += Math.abs(tx.amount);
      }
    });
    
    return Object.values(cats)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
      .map((c) => ({ ...c, name: catLabel(getCat(c.id)) }));
  }, [transactions, getCat, catLabel]);
  
  // Summary stats
  const stats = useMemo(() => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);
    
    let thisMonthExp = 0;
    let lastMonthExp = 0;
    let thisMonthInc = 0;
    
    transactions.forEach((tx) => {
      if (tx.date.startsWith(thisMonth)) {
        if (tx.amount < 0) thisMonthExp += Math.abs(tx.amount);
        else thisMonthInc += tx.amount;
      } else if (tx.date.startsWith(lastMonth) && tx.amount < 0) {
        lastMonthExp += Math.abs(tx.amount);
      }
    });
    
    const change = lastMonthExp > 0 ? ((thisMonthExp - lastMonthExp) / lastMonthExp) * 100 : 0;
    return { thisMonthExp, thisMonthInc, change };
  }, [transactions]);
  
  const formatAmount = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  return (
    <div className="screen-container">
      {/* Large Title */}
      <header className="screen-header">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveScreen("home")}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center active:opacity-70"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-large-title text-foreground">{t.analytics}</h1>
            <p className="text-caption">{t.monthSpending}</p>
          </div>
        </div>
      </header>
      
      {/* Summary Cards (Info Card pattern) */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-info"
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-destructive" />
            <span className="text-caption">{t.expenses}</span>
          </div>
          <p className="text-title amount-expense">-{formatAmount(stats.thisMonthExp)}</p>
          {stats.change !== 0 && (
            <p className={`text-caption mt-1 ${stats.change > 0 ? 'amount-expense' : 'amount-income'}`}>
              {stats.change > 0 ? '↑' : '↓'} {Math.abs(stats.change).toFixed(0)}% vs last month
            </p>
          )}
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="card-info"
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-[hsl(var(--income))]" />
            <span className="text-caption">{t.income}</span>
          </div>
          <p className="text-title amount-income">+{formatAmount(stats.thisMonthInc)}</p>
        </motion.div>
      </div>
      
      {/* Weekly Trend Chart */}
      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-info mb-6"
      >
        <h3 className="text-body-medium text-foreground mb-4">{t.weekSpending}</h3>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--expense))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--expense))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--income))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--income))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="label" 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                tickFormatter={formatAmount}
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="hsl(var(--expense))"
                strokeWidth={2}
                fill="url(#expenseGradient)"
              />
              <Area
                type="monotone"
                dataKey="income"
                stroke="hsl(var(--income))"
                strokeWidth={2}
                fill="url(#incomeGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
      
      {/* Monthly Bar Chart */}
      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="card-info mb-6"
      >
        <h3 className="text-body-medium text-foreground mb-4">{t.monthSpending}</h3>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <XAxis 
                dataKey="week" 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                tickFormatter={formatAmount}
              />
              <Bar dataKey="expenses" fill="hsl(var(--expense))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="income" fill="hsl(var(--income))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
      
      {/* Category Pie Chart */}
      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card-info mb-6"
      >
        <h3 className="text-body-medium text-foreground mb-4">{t.topCategories}</h3>
        {categoryData.length > 0 ? (
          <div className="flex items-center gap-4">
            <div className="w-32 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {categoryData.map((cat) => (
                <div key={cat.id} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: cat.color }} 
                  />
                  <span className="text-caption flex-1 truncate">{cat.name}</span>
                  <span className="text-caption">{formatAmount(cat.value)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-caption">{t.empty}</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AnalyticsScreen;