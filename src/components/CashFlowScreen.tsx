import React, { useState, useMemo, memo } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { CashFlowForecast, CashFlowEvent, Subscription, RecurringTransaction } from "@/types";
import { safeJSON } from "@/lib/storage";
import { formatCurrency } from "@/lib/exportData";
import { TrendingUp, TrendingDown, Calendar, AlertTriangle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from "recharts";

export const CashFlowScreen = memo(() => {
  const { lang, currency, setActiveScreen, balance, transactions } = useApp();
  const [forecastDays, setForecastDays] = useState(30);
  
  // Get recurring transactions and subscriptions
  const recurring = useMemo(() => safeJSON.get<RecurringTransaction[]>("hamyon_recurring", []), []);
  const subscriptions = useMemo(() => safeJSON.get<Subscription[]>("hamyon_subscriptions", []), []);

  const t = {
    title: lang === "ru" ? "Прогноз денежного потока" : lang === "uz" ? "Pul oqimi prognozi" : "Cash Flow Forecast",
    projected: lang === "ru" ? "Прогнозируемый баланс" : lang === "uz" ? "Prognoz qilingan balans" : "Projected Balance",
    inflows: lang === "ru" ? "Поступления" : lang === "uz" ? "Kirimlar" : "Inflows",
    outflows: lang === "ru" ? "Расходы" : lang === "uz" ? "Chiqimlar" : "Outflows",
    days: lang === "ru" ? "дней" : lang === "uz" ? "kun" : "days",
    warning: lang === "ru" ? "Низкий баланс" : lang === "uz" ? "Past balans" : "Low Balance",
    upcoming: lang === "ru" ? "Предстоящие" : lang === "uz" ? "Kelayotgan" : "Upcoming",
    noData: lang === "ru" ? "Добавьте регулярные транзакции" : lang === "uz" ? "Muntazam tranzaksiyalar qo'shing" : "Add recurring transactions",
  };

  // Generate forecast data
  const forecast = useMemo(() => {
    const today = new Date();
    const data: CashFlowForecast[] = [];
    let runningBalance = balance;
    
    for (let i = 0; i <= forecastDays; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().slice(0, 10);
      const dayOfWeek = date.getDay();
      const dayOfMonth = date.getDate();
      
      let inflows = 0;
      let outflows = 0;
      const events: CashFlowEvent[] = [];
      
      // Check recurring transactions
      recurring.forEach(rec => {
        if (!rec.active) return;
        
        let matches = false;
        if (rec.frequency === "daily") {
          matches = true;
        } else if (rec.frequency === "weekly" && new Date(rec.nextDate).getDay() === dayOfWeek) {
          matches = true;
        } else if (rec.frequency === "monthly" && new Date(rec.nextDate).getDate() === dayOfMonth) {
          matches = true;
        } else if (rec.frequency === "yearly") {
          const nextDate = new Date(rec.nextDate);
          matches = nextDate.getMonth() === date.getMonth() && nextDate.getDate() === dayOfMonth;
        }
        
        if (matches) {
          const amount = Math.abs(rec.amount);
          if (rec.type === "income") {
            inflows += amount;
          } else {
            outflows += amount;
          }
          events.push({
            id: rec.id,
            type: rec.type,
            name: rec.description,
            amount: rec.type === "income" ? amount : -amount,
            date: dateStr,
          });
        }
      });
      
      // Check subscriptions
      subscriptions.forEach(sub => {
        if (!sub.active) return;
        if (sub.nextBillingDate === dateStr) {
          outflows += sub.amount;
          events.push({
            id: sub.id,
            type: "subscription",
            name: sub.name,
            amount: -sub.amount,
            date: dateStr,
          });
        }
      });
      
      runningBalance = runningBalance + inflows - outflows;
      
      data.push({
        date: dateStr,
        projectedBalance: runningBalance,
        inflows,
        outflows,
        events,
      });
    }
    
    return data;
  }, [balance, recurring, subscriptions, forecastDays]);

  // Find low balance warnings
  const lowBalanceWarnings = useMemo(() => {
    return forecast.filter(f => f.projectedBalance < 0);
  }, [forecast]);

  // Chart data
  const chartData = useMemo(() => {
    return forecast.map(f => ({
      date: f.date.slice(5),
      balance: f.projectedBalance,
    }));
  }, [forecast]);

  // Upcoming events (next 7 days)
  const upcomingEvents = useMemo(() => {
    const events: CashFlowEvent[] = [];
    forecast.slice(1, 8).forEach(f => {
      events.push(...f.events);
    });
    return events;
  }, [forecast]);

  const minBalance = Math.min(...forecast.map(f => f.projectedBalance));
  const maxBalance = Math.max(...forecast.map(f => f.projectedBalance));
  const endBalance = forecast[forecast.length - 1]?.projectedBalance || balance;
  const balanceChange = endBalance - balance;

  return (
    <div className="pb-24 px-4 pt-2 safe-top">
      {/* Header */}
      <header className="flex items-center gap-3 mb-6">
        <button onClick={() => setActiveScreen("home")} className="text-2xl">←</button>
        <h1 className="text-xl font-bold text-foreground">{t.title}</h1>
      </header>

      {/* Forecast Period Selector */}
      <div className="flex gap-2 mb-6">
        {[7, 14, 30, 90].map(days => (
          <button
            key={days}
            onClick={() => setForecastDays(days)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium ${
              forecastDays === days ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
            }`}
          >
            {days} {t.days}
          </button>
        ))}
      </div>

      {/* Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-3xl bg-gradient-to-br from-primary/30 via-primary/10 to-transparent border border-primary/20 mb-6"
      >
        <p className="text-sm text-muted-foreground mb-2">{t.projected}</p>
        <div className="flex items-baseline gap-3 mb-4">
          <h2 className="text-3xl font-bold text-foreground">
            {formatCurrency(endBalance, currency)}
          </h2>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${
              balanceChange >= 0 ? 'bg-income/20 text-income' : 'bg-expense/20 text-expense'
            }`}
          >
            {balanceChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{balanceChange >= 0 ? '+' : ''}{formatCurrency(balanceChange, currency)}</span>
          </motion.div>
        </div>

        {/* Low Balance Warning */}
        {lowBalanceWarnings.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-3 rounded-xl bg-destructive/20 border border-destructive/30 flex items-center gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <div>
              <p className="text-sm font-medium text-destructive">{t.warning}</p>
              <p className="text-xs text-muted-foreground">
                {lowBalanceWarnings[0].date}
              </p>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Forecast Chart */}
      {chartData.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-2xl bg-card border border-border mb-6"
        >
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="cashFlowGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis hide />
                <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    padding: '8px 12px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number) => [formatCurrency(value, currency), t.projected]}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#cashFlowGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Upcoming Events */}
      <section>
        <h3 className="text-lg font-semibold text-foreground mb-3">{t.upcoming}</h3>
        {upcomingEvents.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground bg-secondary rounded-xl">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>{t.noData}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingEvents.map((event, index) => (
              <motion.div
                key={`${event.id}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-3 rounded-xl bg-card border border-border flex items-center gap-3"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  event.amount >= 0 ? 'bg-income/20 text-income' : 'bg-expense/20 text-expense'
                }`}>
                  {event.amount >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{event.name}</p>
                  <p className="text-sm text-muted-foreground">{event.date}</p>
                </div>
                <p className={`font-bold ${event.amount >= 0 ? 'text-income' : 'text-expense'}`}>
                  {event.amount >= 0 ? '+' : ''}{formatCurrency(event.amount, currency)}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
});

export default CashFlowScreen;
