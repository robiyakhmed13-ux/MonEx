import React, { useState, useMemo, memo } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { CashFlowForecast, CashFlowEvent, Subscription, RecurringTransaction } from "@/types";
import { safeJSON } from "@/lib/storage";
import { formatCurrency } from "@/lib/exportData";
import { TrendingUp, TrendingDown, Calendar, AlertTriangle, ArrowLeft } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine, ComposedChart, Bar, Line } from "recharts";

export const CashFlowScreen = memo(() => {
  const { lang, currency, setActiveScreen, balance, transactions } = useApp();
  const [forecastDays, setForecastDays] = useState(30);
  
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
    dailyChart: lang === "ru" ? "Ежедневный баланс" : lang === "uz" ? "Kunlik balans" : "Daily Balance",
    flowChart: lang === "ru" ? "Приход / Расход" : lang === "uz" ? "Kirim / Chiqim" : "In / Out",
    totalIn: lang === "ru" ? "Всего поступлений" : lang === "uz" ? "Jami kirimlar" : "Total Inflows",
    totalOut: lang === "ru" ? "Всего расходов" : lang === "uz" ? "Jami chiqimlar" : "Total Outflows",
    netChange: lang === "ru" ? "Чистое изменение" : lang === "uz" ? "Sof o'zgarish" : "Net Change",
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

  const lowBalanceWarnings = useMemo(() => {
    return forecast.filter(f => f.projectedBalance < 0);
  }, [forecast]);

  // Chart data for daily balance
  const dailyChartData = useMemo(() => {
    return forecast.map((f, i) => ({
      day: i,
      date: f.date.slice(5),
      balance: f.projectedBalance,
      inflows: f.inflows,
      outflows: f.outflows,
    }));
  }, [forecast]);

  // Aggregated flow data for bar chart (weekly buckets for 30+ days)
  const flowChartData = useMemo(() => {
    if (forecastDays <= 14) {
      // Daily bars for short periods
      return forecast.slice(1).map(f => ({
        label: f.date.slice(8),
        inflows: f.inflows,
        outflows: f.outflows,
      })).filter(d => d.inflows > 0 || d.outflows > 0);
    } else {
      // Weekly aggregation for longer periods
      const weeks: Array<{ label: string; inflows: number; outflows: number }> = [];
      for (let i = 0; i < forecast.length; i += 7) {
        const weekData = forecast.slice(i, i + 7);
        weeks.push({
          label: `W${Math.floor(i / 7) + 1}`,
          inflows: weekData.reduce((s, d) => s + d.inflows, 0),
          outflows: weekData.reduce((s, d) => s + d.outflows, 0),
        });
      }
      return weeks;
    }
  }, [forecast, forecastDays]);

  const upcomingEvents = useMemo(() => {
    const events: CashFlowEvent[] = [];
    forecast.slice(1, 8).forEach(f => {
      events.push(...f.events);
    });
    return events;
  }, [forecast]);

  const endBalance = forecast[forecast.length - 1]?.projectedBalance || balance;
  const balanceChange = endBalance - balance;
  const totalInflows = forecast.reduce((s, f) => s + f.inflows, 0);
  const totalOutflows = forecast.reduce((s, f) => s + f.outflows, 0);

  return (
    <div className="screen-container">
      {/* Header */}
      <header className="screen-header">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setActiveScreen("home")} 
            className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center active:opacity-80"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-large-title text-foreground">{t.title}</h1>
        </div>
      </header>

      {/* Forecast Period Selector */}
      <div className="flex gap-2 mb-section">
        {[7, 14, 30, 60, 90].map(days => (
          <button
            key={days}
            onClick={() => setForecastDays(days)}
            className={`flex-1 py-2.5 rounded-xl text-body-medium transition-opacity active:opacity-80 ${
              forecastDays === days ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
            }`}
          >
            {days} {t.days}
          </button>
        ))}
      </div>

      {/* Summary Card */}
      <div className="card-elevated mb-section p-5">
        <p className="text-caption mb-2">{t.projected}</p>
        <div className="flex items-baseline gap-3 mb-4">
          <h2 className="text-display text-foreground">
            {formatCurrency(endBalance, currency)}
          </h2>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-body-medium ${
            balanceChange >= 0 ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense'
          }`}>
            {balanceChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{balanceChange >= 0 ? '+' : ''}{formatCurrency(balanceChange, currency)}</span>
          </div>
        </div>

        {lowBalanceWarnings.length > 0 && (
          <div className="p-3 rounded-xl bg-destructive/10 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <div>
              <p className="text-body-medium text-destructive">{t.warning}</p>
              <p className="text-caption">{lowBalanceWarnings[0].date}</p>
            </div>
          </div>
        )}
      </div>

      {/* Summary Stats - Info Cards */}
      <div className="grid grid-cols-3 gap-3 mb-section">
        <div className="card-info">
          <p className="text-caption">{t.totalIn}</p>
          <p className="text-title text-income">+{formatCurrency(totalInflows, currency)}</p>
        </div>
        <div className="card-info">
          <p className="text-caption">{t.totalOut}</p>
          <p className="text-title text-expense">-{formatCurrency(totalOutflows, currency)}</p>
        </div>
        <div className="card-info">
          <p className="text-caption">{t.netChange}</p>
          <p className={`text-title ${balanceChange >= 0 ? 'text-income' : 'text-expense'}`}>
            {balanceChange >= 0 ? '+' : ''}{formatCurrency(balanceChange, currency)}
          </p>
        </div>
      </div>

      {/* Daily Balance Chart */}
      {dailyChartData.length > 1 && (
        <div className="card-elevated mb-section">
          <h3 className="text-title text-foreground mb-4">{t.dailyChart}</h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyChartData}>
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
        </div>
      )}

      {/* Inflow/Outflow Chart */}
      {flowChartData.length > 0 && (
        <div className="card-elevated mb-section">
          <h3 className="text-title text-foreground mb-4">{t.flowChart}</h3>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={flowChartData}>
                <XAxis 
                  dataKey="label" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    padding: '8px 12px',
                  }}
                  formatter={(value: number, name: string) => [
                    formatCurrency(value, currency),
                    name === 'inflows' ? t.inflows : t.outflows
                  ]}
                />
                <Bar dataKey="inflows" fill="hsl(var(--income))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="outflows" fill="hsl(var(--expense))" radius={[4, 4, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Upcoming Events */}
      <section>
        <h3 className="text-title text-foreground mb-4">{t.upcoming}</h3>
        {upcomingEvents.length === 0 ? (
          <div className="card-insight justify-center py-8">
            <Calendar className="w-6 h-6 text-muted-foreground" />
            <p className="text-body text-muted-foreground">{t.noData}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingEvents.map((event, index) => (
              <div
                key={`${event.id}-${index}`}
                className="card-info flex items-center gap-3"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  event.amount >= 0 ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense'
                }`}>
                  {event.amount >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <p className="text-body-medium text-foreground">{event.name}</p>
                  <p className="text-caption">{event.date}</p>
                </div>
                <p className={`text-body-medium ${event.amount >= 0 ? 'text-income' : 'text-expense'}`}>
                  {event.amount >= 0 ? '+' : ''}{formatCurrency(event.amount, currency)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
});

export default CashFlowScreen;
