import { Transaction } from '@/types';

export interface Anomaly {
  id: string;
  type: 'amount' | 'time' | 'frequency' | 'merchant' | 'duplicate' | 'behavioral';
  severity: 'low' | 'medium' | 'high' | 'critical';
  transaction: Transaction;
  description: string;
  score: number; // 0-100, higher = more anomalous
  recommendation: string;
  possibleFraud: boolean;
}

export interface AnomalyReport {
  anomalies: Anomaly[];
  riskScore: number; // 0-100
  summary: string;
  criticalCount: number;
  recommendations: string[];
}

export class AnomalyDetector {
  private transactions: Transaction[];
  private historicalData: Map<string, {
    avgAmount: number;
    maxAmount: number;
    minAmount: number;
    stdDev: number;
    count: number;
    typicalHours: number[];
  }>;

  constructor(transactions: Transaction[]) {
    this.transactions = transactions.sort((a, b) => 
      new Date(b.date + ' ' + (b.time || '00:00')).getTime() - 
      new Date(a.date + ' ' + (a.time || '00:00')).getTime()
    );
    this.historicalData = this.buildHistoricalProfile();
  }

  // Build historical spending profile per category
  private buildHistoricalProfile() {
    const profile = new Map<string, any>();
    
    // Group by category
    const byCategory: Record<string, Transaction[]> = {};
    this.transactions.forEach(tx => {
      if (tx.amount < 0) {
        if (!byCategory[tx.categoryId]) byCategory[tx.categoryId] = [];
        byCategory[tx.categoryId].push(tx);
      }
    });

    // Calculate stats per category
    for (const [categoryId, txs] of Object.entries(byCategory)) {
      if (txs.length < 3) continue; // Need at least 3 transactions for stats

      const amounts = txs.map(t => Math.abs(t.amount));
      const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const variance = amounts.reduce((s, a) => s + Math.pow(a - avg, 2), 0) / amounts.length;
      const stdDev = Math.sqrt(variance);

      // Extract typical hours
      const hours = txs
        .filter(t => t.time)
        .map(t => parseInt(t.time!.split(':')[0]));
      
      profile.set(categoryId, {
        avgAmount: avg,
        maxAmount: Math.max(...amounts),
        minAmount: Math.min(...amounts),
        stdDev,
        count: txs.length,
        typicalHours: hours
      });
    }

    return profile;
  }

  // Detect amount anomalies (transactions much larger than usual)
  detectAmountAnomalies(): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const recentTx = this.transactions.slice(0, 50); // Last 50 transactions

    for (const tx of recentTx) {
      if (tx.amount >= 0) continue; // Only expenses

      const profile = this.historicalData.get(tx.categoryId);
      if (!profile || profile.count < 3) continue;

      const amount = Math.abs(tx.amount);
      const zScore = (amount - profile.avgAmount) / profile.stdDev;

      // If amount is > 3 standard deviations, it's highly anomalous
      if (zScore > 3) {
        const multiplier = amount / profile.avgAmount;
        
        anomalies.push({
          id: `amount_${tx.id}`,
          type: 'amount',
          severity: zScore > 5 ? 'critical' : zScore > 4 ? 'high' : 'medium',
          transaction: tx,
          description: `This ${tx.categoryId} purchase (${amount.toLocaleString()}) is ${multiplier.toFixed(1)}x your usual amount (avg: ${Math.round(profile.avgAmount).toLocaleString()})`,
          score: Math.min(100, Math.round(zScore * 10)),
          recommendation: multiplier > 10 ? 'Verify this transaction. If unauthorized, report immediately.' : 'Review if this large purchase was planned.',
          possibleFraud: multiplier > 10 || amount > profile.maxAmount * 2
        });
      }
    }

    return anomalies;
  }

  // Detect time-based anomalies (unusual hour/time)
  detectTimeAnomalies(): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const recentTx = this.transactions.slice(0, 50).filter(t => t.time && t.amount < 0);

    for (const tx of recentTx) {
      const hour = parseInt(tx.time!.split(':')[0]);
      const profile = this.historicalData.get(tx.categoryId);
      
      if (!profile || profile.typicalHours.length < 5) continue;

      // Late night (after 11pm) or very early (before 5am)
      if (hour >= 23 || hour < 5) {
        const lateNightCount = profile.typicalHours.filter(h => h >= 23 || h < 5).length;
        const percentage = (lateNightCount / profile.typicalHours.length) * 100;

        // If this is unusual for this category
        if (percentage < 20) {
          anomalies.push({
            id: `time_${tx.id}`,
            type: 'time',
            severity: hour >= 2 && hour < 5 ? 'high' : 'medium',
            transaction: tx,
            description: `${tx.categoryId} purchase at ${tx.time} is unusual. You typically don't buy ${tx.categoryId} at this hour.`,
            score: Math.round((100 - percentage) * 0.8),
            recommendation: hour >= 2 && hour < 5 
              ? 'Purchases between 2-5 AM are uncommon. Verify this wasn\'t fraudulent.'
              : 'Late-night purchases may indicate stress spending. Monitor this pattern.',
            possibleFraud: hour >= 2 && hour < 5 && Math.abs(tx.amount) > profile.avgAmount * 2
          });
        }
      }
    }

    return anomalies;
  }

  // Detect frequency anomalies (too many transactions in short time)
  detectFrequencyAnomalies(): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const recentTx = this.transactions.slice(0, 100).filter(t => t.amount < 0);

    // Group by category and check last 24 hours
    const byCategory: Record<string, Transaction[]> = {};
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    recentTx.forEach(tx => {
      const txDate = new Date(tx.date + ' ' + (tx.time || '12:00'));
      if (txDate > yesterday) {
        if (!byCategory[tx.categoryId]) byCategory[tx.categoryId] = [];
        byCategory[tx.categoryId].push(tx);
      }
    });

    for (const [categoryId, txs] of Object.entries(byCategory)) {
      if (txs.length >= 5) { // 5+ transactions in same category in 24h
        const profile = this.historicalData.get(categoryId);
        const avgDailyCount = profile ? profile.count / Math.max(1, this.getDaysSpan()) : 1;

        if (txs.length > avgDailyCount * 3) {
          const total = txs.reduce((s, t) => s + Math.abs(t.amount), 0);
          
          anomalies.push({
            id: `freq_${categoryId}_${Date.now()}`,
            type: 'frequency',
            severity: txs.length > 10 ? 'critical' : txs.length > 7 ? 'high' : 'medium',
            transaction: txs[0],
            description: `${txs.length} ${categoryId} purchases in last 24 hours (${total.toLocaleString()}). This is ${Math.round(txs.length / avgDailyCount)}x your usual frequency.`,
            score: Math.min(100, txs.length * 10),
            recommendation: txs.length > 10 
              ? 'This is highly unusual. Check for duplicate charges or fraudulent activity.'
              : 'High frequency may indicate impulse buying. Consider a cooling-off period.',
            possibleFraud: txs.length > 10
          });
        }
      }
    }

    return anomalies;
  }

  // Detect duplicate transactions (same amount, same merchant, close timing)
  detectDuplicates(): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const recentTx = this.transactions.slice(0, 100).filter(t => t.amount < 0);

    for (let i = 0; i < recentTx.length; i++) {
      for (let j = i + 1; j < recentTx.length; j++) {
        const tx1 = recentTx[i];
        const tx2 = recentTx[j];

        // Same category and amount
        if (tx1.categoryId === tx2.categoryId && tx1.amount === tx2.amount) {
          const date1 = new Date(tx1.date + ' ' + (tx1.time || '12:00'));
          const date2 = new Date(tx2.date + ' ' + (tx2.time || '12:00'));
          const timeDiffMinutes = Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60);

          // If within 5 minutes, likely duplicate
          if (timeDiffMinutes < 5) {
            anomalies.push({
              id: `dup_${tx1.id}_${tx2.id}`,
              type: 'duplicate',
              severity: 'high',
              transaction: tx1,
              description: `Potential duplicate: ${tx1.categoryId} - ${Math.abs(tx1.amount).toLocaleString()} charged twice within ${Math.round(timeDiffMinutes)} minutes`,
              score: 90,
              recommendation: 'Check your bank statement. If this is a duplicate charge, request a refund.',
              possibleFraud: true
            });
            break; // Don't flag same transaction multiple times
          }
        }
      }
    }

    return anomalies;
  }

  // Detect behavioral changes (sudden shift in spending personality)
  detectBehavioralChanges(): Anomaly[] {
    const anomalies: Anomaly[] = [];
    
    // Compare last 7 days vs previous 30 days
    const now = new Date();
    const last7days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const last30days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const prev30to37days = new Date(now.getTime() - 37 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const recent = this.transactions.filter(t => t.date >= last7days && t.amount < 0);
    const baseline = this.transactions.filter(t => t.date >= last30days && t.date < last7days && t.amount < 0);

    if (recent.length < 5 || baseline.length < 10) return anomalies;

    // Calculate daily averages
    const recentDailyAvg = recent.reduce((s, t) => s + Math.abs(t.amount), 0) / 7;
    const baselineDailyAvg = baseline.reduce((s, t) => s + Math.abs(t.amount), 0) / 23;

    const percentChange = ((recentDailyAvg - baselineDailyAvg) / baselineDailyAvg) * 100;

    if (Math.abs(percentChange) > 50) {
      anomalies.push({
        id: `behavioral_change_${Date.now()}`,
        type: 'behavioral',
        severity: Math.abs(percentChange) > 100 ? 'critical' : 'high',
        transaction: recent[0],
        description: `Your spending pattern changed dramatically: ${percentChange > 0 ? '+' : ''}${Math.round(percentChange)}% in last 7 days vs previous weeks (${Math.round(recentDailyAvg).toLocaleString()}/day vs ${Math.round(baselineDailyAvg).toLocaleString()}/day)`,
        score: Math.min(100, Math.abs(percentChange)),
        recommendation: percentChange > 0 
          ? 'Significant increase in spending detected. Review your recent purchases and consider if this is sustainable.'
          : 'Significant decrease detected. Great job if this is intentional savings!',
        possibleFraud: percentChange > 200
      });
    }

    return anomalies;
  }

  // Get days span of transaction history
  private getDaysSpan(): number {
    if (this.transactions.length < 2) return 1;
    const oldest = new Date(this.transactions[this.transactions.length - 1].date);
    const newest = new Date(this.transactions[0].date);
    return Math.max(1, Math.floor((newest.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24)));
  }

  // Run all detections and generate comprehensive report
  generateReport(): AnomalyReport {
    const allAnomalies: Anomaly[] = [
      ...this.detectAmountAnomalies(),
      ...this.detectTimeAnomalies(),
      ...this.detectFrequencyAnomalies(),
      ...this.detectDuplicates(),
      ...this.detectBehavioralChanges()
    ];

    // Remove duplicates and sort by severity
    const uniqueAnomalies = Array.from(new Map(allAnomalies.map(a => [a.id, a])).values())
      .sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity] || b.score - a.score;
      });

    // Calculate risk score
    const criticalCount = uniqueAnomalies.filter(a => a.severity === 'critical').length;
    const highCount = uniqueAnomalies.filter(a => a.severity === 'high').length;
    const fraudCount = uniqueAnomalies.filter(a => a.possibleFraud).length;

    const riskScore = Math.min(100, 
      criticalCount * 30 + 
      highCount * 20 + 
      fraudCount * 25 +
      uniqueAnomalies.length * 2
    );

    // Generate summary
    let summary = '';
    if (riskScore >= 70) {
      summary = '🚨 High risk: Multiple critical anomalies detected. Review immediately.';
    } else if (riskScore >= 40) {
      summary = '⚠️ Medium risk: Several unusual patterns detected. Monitor closely.';
    } else if (riskScore >= 20) {
      summary = '👀 Low risk: Some minor anomalies. Worth reviewing.';
    } else {
      summary = '✅ All clear: No significant anomalies detected.';
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (fraudCount > 0) {
      recommendations.push('Check your bank statement for unauthorized charges');
    }
    if (criticalCount > 0) {
      recommendations.push('Review critical alerts immediately');
    }
    if (uniqueAnomalies.some(a => a.type === 'behavioral')) {
      recommendations.push('Your spending behavior has changed significantly - is everything OK?');
    }
    if (uniqueAnomalies.some(a => a.type === 'frequency')) {
      recommendations.push('Consider setting purchase limits to prevent impulse buying');
    }

    return {
      anomalies: uniqueAnomalies.slice(0, 10), // Top 10 most critical
      riskScore: Math.round(riskScore),
      summary,
      criticalCount,
      recommendations
    };
  }
}

export const createAnomalyDetector = (transactions: Transaction[]) => {
  return new AnomalyDetector(transactions);
};
