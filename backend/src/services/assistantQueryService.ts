import { prisma } from '../lib/prisma';
import { TransactionType } from '@prisma/client';

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

export interface CategoryBreakdownItem {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

export interface ComparisonResult {
  currentPeriodLabel: string;
  currentTotal: number;
  previousPeriodLabel: string;
  previousTotal: number;
  difference: number;
  percentageChange: number | null; // null if previous was 0
  trend: 'INCREASED' | 'DECREASED' | 'NO_CHANGE';
}

/**
 * Monetary arithmetic helpers to avoid IEEE 754 floating-point drift
 */
export function roundToCents(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function sumAmounts(amounts: number[]): number {
  const totalCents = amounts.reduce((acc, val) => acc + Math.round((val + Number.EPSILON) * 100), 0);
  return totalCents / 100;
}

export const assistantQueryService = {
  /**
   * Resolves standard date ranges deterministically
   */
  resolveDateRange(preset: string, referenceDate: Date = new Date()): DateRange {
    const ref = new Date(referenceDate);
    const year = ref.getFullYear();
    const month = ref.getMonth();
    const day = ref.getDate();

    switch (preset.toLowerCase()) {
      case 'today': {
        const start = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
        const end = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
        return { start, end, label: 'today' };
      }
      case 'yesterday': {
        const yesterday = new Date(ref);
        yesterday.setDate(day - 1);
        const yYear = yesterday.getFullYear();
        const yMonth = yesterday.getMonth();
        const yDay = yesterday.getDate();
        const start = new Date(Date.UTC(yYear, yMonth, yDay, 0, 0, 0, 0));
        const end = new Date(Date.UTC(yYear, yMonth, yDay, 23, 59, 59, 999));
        return { start, end, label: 'yesterday' };
      }
      case 'this_week': {
        // Monday as start of week
        const dayOfWeek = ref.getDay(); // 0 is Sunday
        const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const monday = new Date(ref);
        monday.setDate(day - distanceToMonday);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        const start = new Date(Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate(), 0, 0, 0, 0));
        const end = new Date(Date.UTC(sunday.getFullYear(), sunday.getMonth(), sunday.getDate(), 23, 59, 59, 999));
        return { start, end, label: 'this week' };
      }
      case 'last_week': {
        const dayOfWeek = ref.getDay();
        const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const lastMonday = new Date(ref);
        lastMonday.setDate(day - distanceToMonday - 7);

        const lastSunday = new Date(lastMonday);
        lastSunday.setDate(lastMonday.getDate() + 6);

        const start = new Date(Date.UTC(lastMonday.getFullYear(), lastMonday.getMonth(), lastMonday.getDate(), 0, 0, 0, 0));
        const end = new Date(Date.UTC(lastSunday.getFullYear(), lastSunday.getMonth(), lastSunday.getDate(), 23, 59, 59, 999));
        return { start, end, label: 'last week' };
      }
      case 'this_month': {
        const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
        const lastDay = new Date(Date.UTC(year, month + 1, 0)).getDate();
        const end = new Date(Date.UTC(year, month, lastDay, 23, 59, 59, 999));
        const monthName = ref.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
        return { start, end, label: `this month (${monthName})` };
      }
      case 'last_month': {
        const prevMonthDate = new Date(Date.UTC(year, month - 1, 1));
        const pYear = prevMonthDate.getUTCFullYear();
        const pMonth = prevMonthDate.getUTCMonth();
        const pLastDay = new Date(Date.UTC(pYear, pMonth + 1, 0)).getDate();

        const start = new Date(Date.UTC(pYear, pMonth, 1, 0, 0, 0, 0));
        const end = new Date(Date.UTC(pYear, pMonth, pLastDay, 23, 59, 59, 999));
        const monthName = prevMonthDate.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
        return { start, end, label: `last month (${monthName})` };
      }
      case 'this_year': {
        const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
        const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
        return { start, end, label: `this year (${year})` };
      }
      default: {
        // Fallback to this month
        const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
        const lastDay = new Date(Date.UTC(year, month + 1, 0)).getDate();
        const end = new Date(Date.UTC(year, month, lastDay, 23, 59, 59, 999));
        return { start, end, label: 'this month' };
      }
    }
  },

  /**
   * Resolves month names (e.g. "January", "March") to that specific month's date range
   */
  resolveSpecificMonth(monthName: string, referenceDate: Date = new Date()): DateRange | null {
    const months = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];
    const index = months.findIndex((m) => m.startsWith(monthName.toLowerCase().slice(0, 3)));
    if (index === -1) return null;

    const year = referenceDate.getFullYear();
    const start = new Date(Date.UTC(year, index, 1, 0, 0, 0, 0));
    const lastDay = new Date(Date.UTC(year, index + 1, 0)).getDate();
    const end = new Date(Date.UTC(year, index, lastDay, 23, 59, 59, 999));
    const fullMonthName = months[index].charAt(0).toUpperCase() + months[index].slice(1);
    return { start, end, label: `${fullMonthName} ${year}` };
  },

  /**
   * Total expenses over a date range
   */
  async getTotalExpenses(
    userId: string,
    start: Date,
    end: Date
  ): Promise<{ total: number; count: number }> {
    const aggregate = await prisma.transaction.aggregate({
      where: {
        userId,
        type: TransactionType.EXPENSE,
        date: { gte: start, lte: end },
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    const total = roundToCents(Number(aggregate._sum.amount ?? 0));
    const count = aggregate._count.id;
    return { total, count };
  },

  /**
   * Total income over a date range
   */
  async getTotalIncome(
    userId: string,
    start: Date,
    end: Date
  ): Promise<{ total: number; count: number }> {
    const aggregate = await prisma.transaction.aggregate({
      where: {
        userId,
        type: TransactionType.INCOME,
        date: { gte: start, lte: end },
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    const total = roundToCents(Number(aggregate._sum.amount ?? 0));
    const count = aggregate._count.id;
    return { total, count };
  },

  /**
   * Category-specific spending
   */
  async getCategorySpending(
    userId: string,
    categoryQuery: string,
    start: Date,
    end: Date
  ): Promise<{
    category: string;
    total: number;
    count: number;
    transactions: Array<{ id: string; title: string; amount: number; date: Date }>;
  }> {
    const sanitizedQuery = (categoryQuery || '').replace(/\0/g, '').trim().slice(0, 50);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: TransactionType.EXPENSE,
        category: { contains: sanitizedQuery, mode: 'insensitive' },
        date: { gte: start, lte: end },
      },
      select: {
        id: true,
        title: true,
        amount: true,
        category: true,
        date: true,
      },
      orderBy: { date: 'desc' },
    });

    const total = sumAmounts(transactions.map((t) => Number(t.amount)));
    const matchedCategory = transactions.length > 0 && transactions[0].category
      ? transactions[0].category
      : sanitizedQuery || 'General';

    return {
      category: matchedCategory,
      total,
      count: transactions.length,
      transactions: transactions.map((t) => ({
        id: t.id,
        title: t.title,
        amount: roundToCents(Number(t.amount)),
        date: t.date,
      })),
    };
  },

  /**
   * Category breakdown and top spending categories
   */
  async getTopCategories(
    userId: string,
    start: Date,
    end: Date,
    limit: number = 5
  ): Promise<{ categories: CategoryBreakdownItem[]; totalExpenses: number }> {
    const safeLimit = (!limit || limit <= 0 || isNaN(limit)) ? 5 : Math.min(20, Math.floor(limit));

    const expenses = await prisma.transaction.findMany({
      where: {
        userId,
        type: TransactionType.EXPENSE,
        date: { gte: start, lte: end },
      },
      select: {
        amount: true,
        category: true,
      },
    });

    const totalExpenses = sumAmounts(expenses.map((t) => Number(t.amount)));

    const categoryMap = new Map<string, number[]>();
    for (const t of expenses) {
      const cat = (t.category || 'General').trim();
      const existing = categoryMap.get(cat) || [];
      existing.push(Number(t.amount));
      categoryMap.set(cat, existing);
    }

    const categories: CategoryBreakdownItem[] = Array.from(categoryMap.entries())
      .map(([category, amounts]) => {
        const roundedTotal = sumAmounts(amounts);
        const percentage = totalExpenses > 0 ? Number(((roundedTotal / totalExpenses) * 100).toFixed(1)) : 0;
        return {
          category,
          total: roundedTotal,
          count: amounts.length,
          percentage,
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, safeLimit);

    return { categories, totalExpenses };
  },

  /**
   * Largest expense transactions
   */
  async getLargestExpenses(
    userId: string,
    start: Date,
    end: Date,
    limit: number = 5
  ): Promise<Array<{ id: string; title: string; amount: number; category: string | null; date: Date }>> {
    const safeLimit = (!limit || limit <= 0 || isNaN(limit)) ? 5 : Math.min(20, Math.floor(limit));

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: TransactionType.EXPENSE,
        date: { gte: start, lte: end },
      },
      select: {
        id: true,
        title: true,
        amount: true,
        category: true,
        date: true,
      },
      orderBy: { amount: 'desc' },
      take: safeLimit,
    });

    return transactions.map((t) => ({
      id: t.id,
      title: t.title,
      amount: roundToCents(Number(t.amount)),
      category: t.category,
      date: t.date,
    }));
  },

  /**
   * Month-over-month comparison
   */
  async getMonthlyComparison(userId: string, referenceDate: Date = new Date()): Promise<ComparisonResult> {
    const thisMonth = this.resolveDateRange('this_month', referenceDate);
    const lastMonth = this.resolveDateRange('last_month', referenceDate);

    const [thisRes, lastRes] = await Promise.all([
      this.getTotalExpenses(userId, thisMonth.start, thisMonth.end),
      this.getTotalExpenses(userId, lastMonth.start, lastMonth.end),
    ]);

    const difference = roundToCents(thisRes.total - lastRes.total);
    let percentageChange: number | null = null;
    if (lastRes.total > 0) {
      percentageChange = Number((((thisRes.total - lastRes.total) / lastRes.total) * 100).toFixed(1));
    }

    let trend: 'INCREASED' | 'DECREASED' | 'NO_CHANGE' = 'NO_CHANGE';
    if (difference > 0) trend = 'INCREASED';
    else if (difference < 0) trend = 'DECREASED';

    return {
      currentPeriodLabel: thisMonth.label,
      currentTotal: thisRes.total,
      previousPeriodLabel: lastMonth.label,
      previousTotal: lastRes.total,
      difference,
      percentageChange,
      trend,
    };
  },

  /**
   * Week-over-week comparison
   */
  async getWeeklyComparison(userId: string, referenceDate: Date = new Date()): Promise<ComparisonResult> {
    const thisWeek = this.resolveDateRange('this_week', referenceDate);
    const lastWeek = this.resolveDateRange('last_week', referenceDate);

    const [thisRes, lastRes] = await Promise.all([
      this.getTotalExpenses(userId, thisWeek.start, thisWeek.end),
      this.getTotalExpenses(userId, lastWeek.start, lastWeek.end),
    ]);

    const difference = roundToCents(thisRes.total - lastRes.total);
    let percentageChange: number | null = null;
    if (lastRes.total > 0) {
      percentageChange = Number((((thisRes.total - lastRes.total) / lastRes.total) * 100).toFixed(1));
    }

    let trend: 'INCREASED' | 'DECREASED' | 'NO_CHANGE' = 'NO_CHANGE';
    if (difference > 0) trend = 'INCREASED';
    else if (difference < 0) trend = 'DECREASED';

    return {
      currentPeriodLabel: thisWeek.label,
      currentTotal: thisRes.total,
      previousPeriodLabel: lastWeek.label,
      previousTotal: lastRes.total,
      difference,
      percentageChange,
      trend,
    };
  },

  /**
   * Average daily spending over a date range
   */
  async getAverageDailySpending(
    userId: string,
    start: Date,
    end: Date
  ): Promise<{ avgDaily: number; total: number; days: number }> {
    const { total } = await this.getTotalExpenses(userId, start, end);
    const days = Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    );
    const avgDaily = roundToCents(total / days);
    return { avgDaily, total, days };
  },
};
