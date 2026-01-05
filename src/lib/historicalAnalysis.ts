import { Transaction } from '@/types';

export interface HistoricalPattern {
  period: 'week' | 'month' | 'quarter' | 'year';
  current: number;
  previous: number;
  yearAgo?: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  percentChange: number;
  seasonalPattern?: string;
}

export interface CategoryPattern {
  categoryId: string;
  monthlyAverage: number;
  peakMonth: { month: string; amount: number };
  lowestMonth: { month: string; amount: number };
  trend: 'increasing' | 'decreasing' | 'stable';
  seasonality: 'high' | 'low' | 'none';
}

export interface SpendingInsight {
  type: 'seasonal' | 'trend' | 'anomaly' | 'habit';
  severity: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  data: any;
}

export class HistoricalAnalyzer {
  private transactions: Transaction[];

  constructor(transactions: Transaction[]) {
    this.transactions = transactions.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  // Get spending for a specific period
  private getSpendingForPeriod(startDate: string, endDate: string): number {
    return this.transactions
      .filter(t => t.date >= startDate && t.date <= endDate && t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }

  // Week-over-week comparison
  getWeekOverWeek(): HistoricalPattern {
    const now = new Date();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay()); // Start of this week (Sunday)
    
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);

    const thisWeekSpending = this.getSpendingForPeriod(
      thisWeekStart.toISOString().slice(0, 10),
      now.toISOString().slice(0, 10)
    );

    const lastWeekSpending = this.getSpendingForPeriod(
      lastWeekStart.toISOString().slice(0, 10),
      lastWeekEnd.toISOString().slice(0, 10)
    );

    const percentChange = lastWeekSpending > 0 
      ? ((thisWeekSpending - lastWeekSpending) / lastWeekSpending) * 100 
      : 0;

    return {
      period: 'week',
      current: thisWeekSpending,
      previous: lastWeekSpending,
      trend: percentChange > 10 ? 'increasing' : percentChange < -10 ? 'decreasing' : 'stable',
      percentChange: Math.round(percentChange)
    };
  }

  // Month-over-month comparison
  getMonthOverMonth(): HistoricalPattern {
    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
    const yearAgoMonth = new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString().slice(0, 7);

    const thisMonthSpending = this.transactions
      .filter(t => t.date.startsWith(thisMonth) && t.amount < 0)
      .reduce((s, t) => s + Math.abs(t.amount), 0);

    const lastMonthSpending = this.transactions
      .filter(t => t.date.startsWith(lastMonth) && t.amount < 0)
      .reduce((s, t) => s + Math.abs(t.amount), 0);

    const yearAgoSpending = this.transactions
      .filter(t => t.date.startsWith(yearAgoMonth) && t.amount < 0)
      .reduce((s, t) => s + Math.abs(t.amount), 0);

    const percentChange = lastMonthSpending > 0
      ? ((thisMonthSpending - lastMonthSpending) / lastMonthSpending) * 100
      : 0;

    return {
      period: 'month',
      current: thisMonthSpending,
      previous: lastMonthSpending,
      yearAgo: yearAgoSpending,
      trend: percentChange > 10 ? 'increasing' : percentChange < -10 ? 'decreasing' : 'stable',
      percentChange: Math.round(percentChange)
    };
  }

  // Analyze category patterns over time
  analyzeCategoryPatterns(): CategoryPattern[] {
    const categories = new Set(this.transactions.map(t => t.categoryId));
    const patterns: CategoryPattern[] = [];

    for (const categoryId of categories) {
      const categoryTx = this.transactions.filter(t => t.categoryId === categoryId && t.amount < 0);
      if (categoryTx.length < 3) continue; // Need at least 3 transactions

      // Group by month
      const monthlyData: Record<string, number> = {};
      categoryTx.forEach(t => {
        const month = t.date.slice(0, 7);
        monthlyData[month] = (monthlyData[month] || 0) + Math.abs(t.amount);
      });

      const months = Object.keys(monthlyData).sort();
      if (months.length < 2) continue;

      const amounts = Object.values(monthlyData);
      const average = amounts.reduce((a, b) => a + b, 0) / amounts.length;

      // Find peak and lowest
      const sortedMonths = months.sort((a, b) => monthlyData[b] - monthlyData[a]);
      const peakMonth = { month: sortedMonths[0], amount: monthlyData[sortedMonths[0]] };
      const lowestMonth = { month: sortedMonths[sortedMonths.length - 1], amount: monthlyData[sortedMonths[sortedMonths.length - 1]] };

      // Determine trend (last 3 months vs previous 3 months)
      const recentMonths = months.slice(-3);
      const previousMonths = months.slice(-6, -3);
      
      const recentAvg = recentMonths.reduce((s, m) => s + monthlyData[m], 0) / recentMonths.length;
      const previousAvg = previousMonths.length > 0 
        ? previousMonths.reduce((s, m) => s + monthlyData[m], 0) / previousMonths.length 
        : recentAvg;

      const trendChange = ((recentAvg - previousAvg) / previousAvg) * 100;
      const trend = trendChange > 15 ? 'increasing' : trendChange < -15 ? 'decreasing' : 'stable';

      // Determine seasonality
      const variance = amounts.reduce((s, a) => s + Math.pow(a - average, 2), 0) / amounts.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = (stdDev / average) * 100;
      
      const seasonality = coefficientOfVariation > 50 ? 'high' : coefficientOfVariation > 25 ? 'low' : 'none';

      patterns.push({
        categoryId,
        monthlyAverage: Math.round(average),
        peakMonth,
        lowestMonth,
        trend,
        seasonality
      });
    }

    return patterns.sort((a, b) => b.monthlyAverage - a.monthlyAverage);
  }

  // Generate insights from historical data
  generateInsights(lang: 'uz' | 'ru' | 'en' = 'en'): SpendingInsight[] {
    const insights: SpendingInsight[] = [];
    const patterns = this.analyzeCategoryPatterns();
    const monthComparison = this.getMonthOverMonth();
    const weekComparison = this.getWeekOverWeek();

    // Seasonal spending patterns
    for (const pattern of patterns.filter(p => p.seasonality === 'high')) {
      const peakMonthName = new Date(pattern.peakMonth.month + '-01').toLocaleDateString(lang, { month: 'long' });
      
      insights.push({
        type: 'seasonal',
        severity: 'medium',
        title: lang === 'ru' ? `Сезонный паттерн: ${pattern.categoryId}` 
              : lang === 'uz' ? `Mavsumiy namuna: ${pattern.categoryId}` 
              : `Seasonal pattern: ${pattern.categoryId}`,
        message: lang === 'ru' 
          ? `Вы всегда больше тратите на ${pattern.categoryId} в ${peakMonthName} (${pattern.peakMonth.amount.toLocaleString()}). Планируйте заранее!`
          : lang === 'uz'
          ? `Siz har doim ${peakMonthName} oyida ${pattern.categoryId}ga ko'proq sarflaysiz (${pattern.peakMonth.amount.toLocaleString()}). Oldindan reja tuzing!`
          : `You always spend more on ${pattern.categoryId} in ${peakMonthName} (${pattern.peakMonth.amount.toLocaleString()}). Plan ahead!`,
        data: pattern
      });
    }

    // Year-over-year comparison
    if (monthComparison.yearAgo && monthComparison.yearAgo > 0) {
      const yoyChange = ((monthComparison.current - monthComparison.yearAgo) / monthComparison.yearAgo) * 100;
      
      if (Math.abs(yoyChange) > 20) {
        insights.push({
          type: 'trend',
          severity: yoyChange > 0 ? 'high' : 'low',
          title: lang === 'ru' ? 'Годовое сравнение' 
                : lang === 'uz' ? 'Yillik taqqoslash' 
                : 'Year-over-year',
          message: lang === 'ru'
            ? `Этот месяц: ${Math.abs(yoyChange).toFixed(0)}% ${yoyChange > 0 ? 'больше' : 'меньше'} чем год назад (${monthComparison.yearAgo.toLocaleString()})`
            : lang === 'uz'
            ? `Bu oy: bir yil oldingiga nisbatan ${Math.abs(yoyChange).toFixed(0)}% ${yoyChange > 0 ? 'ko\'proq' : 'kamroq'} (${monthComparison.yearAgo.toLocaleString()})`
            : `This month: ${Math.abs(yoyChange).toFixed(0)}% ${yoyChange > 0 ? 'more' : 'less'} than a year ago (${monthComparison.yearAgo.toLocaleString()})`,
          data: { yoyChange, current: monthComparison.current, yearAgo: monthComparison.yearAgo }
        });
      }
    }

    // Increasing trend warning
    const increasingCategories = patterns.filter(p => p.trend === 'increasing');
    if (increasingCategories.length > 0) {
      const topIncreasing = increasingCategories[0];
      
      insights.push({
        type: 'trend',
        severity: 'high',
        title: lang === 'ru' ? `Рост расходов: ${topIncreasing.categoryId}` 
              : lang === 'uz' ? `Xarajat o'sishi: ${topIncreasing.categoryId}` 
              : `Growing expenses: ${topIncreasing.categoryId}`,
        message: lang === 'ru'
          ? `${topIncreasing.categoryId} растёт последние 3 месяца. Средний: ${topIncreasing.monthlyAverage.toLocaleString()}/мес. Это устойчивый тренд?`
          : lang === 'uz'
          ? `${topIncreasing.categoryId} so'nggi 3 oy o'sib bormoqda. O'rtacha: ${topIncreasing.monthlyAverage.toLocaleString()}/oy. Bu barqaror tendentsiyami?`
          : `${topIncreasing.categoryId} has been growing for 3 months. Average: ${topIncreasing.monthlyAverage.toLocaleString()}/mo. Is this a sustainable trend?`,
        data: topIncreasing
      });
    }

    // Habit formation detection
    const consistentCategories = patterns.filter(p => p.seasonality === 'none' && p.trend === 'stable');
    if (consistentCategories.length > 0) {
      const topHabit = consistentCategories[0];
      
      insights.push({
        type: 'habit',
        severity: 'low',
        title: lang === 'ru' ? `Привычка: ${topHabit.categoryId}` 
              : lang === 'uz' ? `Odat: ${topHabit.categoryId}` 
              : `Habit: ${topHabit.categoryId}`,
        message: lang === 'ru'
          ? `${topHabit.categoryId} стабилен: ~${topHabit.monthlyAverage.toLocaleString()}/мес каждый месяц. Это хорошая привычка!`
          : lang === 'uz'
          ? `${topHabit.categoryId} barqaror: har oyda ~${topHabit.monthlyAverage.toLocaleString()}/oy. Bu yaxshi odat!`
          : `${topHabit.categoryId} is consistent: ~${topHabit.monthlyAverage.toLocaleString()}/mo every month. This is a good habit!`,
        data: topHabit
      });
    }

    return insights;
  }

  // Get spending forecast for next month based on historical data
  forecastNextMonth(): { amount: number; confidence: number; range: { min: number; max: number } } {
    const patterns = this.analyzeCategoryPatterns();
    const monthComparison = this.getMonthOverMonth();
    
    // Simple forecast: average of last 3 months + trend adjustment
    const now = new Date();
    const lastThreeMonths = [0, 1, 2].map(i => {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1).toISOString().slice(0, 7);
      return this.transactions
        .filter(t => t.date.startsWith(month) && t.amount < 0)
        .reduce((s, t) => s + Math.abs(t.amount), 0);
    });

    const average = lastThreeMonths.reduce((a, b) => a + b, 0) / lastThreeMonths.length;
    
    // Adjust for trend
    const trendMultiplier = monthComparison.trend === 'increasing' ? 1.1 : 
                           monthComparison.trend === 'decreasing' ? 0.9 : 1.0;
    
    const forecast = average * trendMultiplier;
    
    // Calculate confidence based on variance
    const variance = lastThreeMonths.reduce((s, a) => s + Math.pow(a - average, 2), 0) / lastThreeMonths.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = (stdDev / average) * 100;
    
    const confidence = Math.max(0, Math.min(100, 100 - coefficientOfVariation));
    
    return {
      amount: Math.round(forecast),
      confidence: Math.round(confidence),
      range: {
        min: Math.round(forecast * 0.85),
        max: Math.round(forecast * 1.15)
      }
    };
  }
}

// Helper function to get analyzer instance
export const createHistoricalAnalyzer = (transactions: Transaction[]) => {
  return new HistoricalAnalyzer(transactions);
};
