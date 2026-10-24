import { TransactionItem } from '../services/dashboardService';

export interface DateGroupedTransactions {
  title: string;
  dateKey: string;
  data: TransactionItem[];
}

/**
 * Groups an array of transactions by date heading (Today, Yesterday, or formatted date).
 * Preserves the original sorting order of transactions.
 */
export const groupTransactionsByDate = (
  transactions: TransactionItem[]
): DateGroupedTransactions[] => {
  const groupsMap = new Map<string, { title: string; data: TransactionItem[] }>();

  const now = new Date();
  const todayKey = getYearMonthDayString(now);

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = getYearMonthDayString(yesterday);

  transactions.forEach((tx) => {
    const txDate = new Date(tx.date);
    if (isNaN(txDate.getTime())) {
      const fallbackKey = 'Other';
      if (!groupsMap.has(fallbackKey)) {
        groupsMap.set(fallbackKey, { title: 'Other Transactions', data: [] });
      }
      groupsMap.get(fallbackKey)!.data.push(tx);
      return;
    }

    const dateKey = getYearMonthDayString(txDate);
    let title = '';

    if (dateKey === todayKey) {
      title = 'Today';
    } else if (dateKey === yesterdayKey) {
      title = 'Yesterday';
    } else {
      const options: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      };
      title = txDate.toLocaleDateString('en-IN', options);
    }

    if (!groupsMap.has(dateKey)) {
      groupsMap.set(dateKey, { title, data: [] });
    }
    groupsMap.get(dateKey)!.data.push(tx);
  });

  return Array.from(groupsMap.entries()).map(([dateKey, group]) => ({
    dateKey,
    title: group.title,
    data: group.data,
  }));
};

function getYearMonthDayString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
