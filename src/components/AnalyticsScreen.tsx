import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

export const AnalyticsScreen: React.FC = () => {
  const { t, transactions, getCat, catLabel, lang } = useApp();
  
  // Calculate weekly data (last 7 days)
  const weeklyData = useMemo(() => {
    const days: Record<string, { date: string; expenses: number; income: number; label: string }> = {};
    const today = new Date();
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayNames = lang === 'ru' 
        ? ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
        : lang === 'uz'
        ? ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh']
        : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      days[key] = { 
        date: key, 
        expenses: 0, 
        income: 0, 
        label: dayNames[d.getDay()] 
      };
    }
    
    // Fill with transaction data
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
  
  // Calculate monthly data (last 4 weeks)
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
  
  // Category breakdown for pie chart
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
      .map((c) => ({
        ...c,
        name: catLabel(getCat(c.id)),
      }));
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
    <div className="screen-container pb-24">
      {/* Header */}
      <div className="safe-top px-4 pt-4 pb-6">
        <h1 className="text-title-1 text-foreground">{t.analytics}</h1>
        <p className="text-sm text-muted-foreground">{t.monthSpending}</p>
      </div>
      
      {/* Summary Cards */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-4"
          >
            <p className="text-xs text-muted-foreground mb-1">{t.expenses}</p>
            <p className="text-xl font-bold text-expense">
              -{formatAmount(stats.thisMonthExp)}
            </p>
            {stats.change !== 0 && (
              <div className={`flex items-center gap-1 mt-1 text-xs ${stats.change > 0 ? 'text-expense' : 'text-income'}`}>
                <span>{stats.change > 0 ? '↑' : '↓'}</span>
                <span>{Math.abs(stats.change).toFixed(0)}%</span>
              </div>
            )}
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-4"
          >
            <p className="text-xs text-muted-foreground mb-1">{t.income}</p>
            <p className="text-xl font-bold text-income">
              +{formatAmount(stats.thisMonthInc)}
            </p>
          </motion.div>
        </div>
      </div>
      
      {/* Weekly Trend Chart */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="px-4 mb-6"
      >
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">{t.weekSpending}</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--expense))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--expense))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--income))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--income))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
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
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  }}
                  formatter={(value: number) => [formatAmount(value), '']}
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stroke="hsl(var(--expense))"
                  strokeWidth={2}
                  fill="url(#expenseGradient)"
                  name={t.expenses}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="hsl(var(--income))"
                  strokeWidth={2}
                  fill="url(#incomeGradient)"
                  name={t.income}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>
      
      {/* Monthly Bar Chart */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="px-4 mb-6"
      >
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">{t.monthSpending}</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
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
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  }}
                  formatter={(value: number) => [formatAmount(value), '']}
                />
                <Bar dataKey="expenses" fill="hsl(var(--expense))" radius={[4, 4, 0, 0]} name={t.expenses} />
                <Bar dataKey="income" fill="hsl(var(--income))" radius={[4, 4, 0, 0]} name={t.income} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>
      
      {/* Category Pie Chart */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="px-4 mb-6"
      >
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">{t.topCategories}</h3>
          {categoryData.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="w-36 h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={55}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                      }}
                      formatter={(value: number) => [formatAmount(value), '']}
                    />
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
                    <span className="text-xs text-foreground truncate flex-1">{cat.name}</span>
                    <span className="text-xs text-muted-foreground font-medium">
                      {formatAmount(cat.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">
              {t.empty}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AnalyticsScreen;
