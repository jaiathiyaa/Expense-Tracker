/**
 * insightsHelpers.ts
 * Pure utility functions for the Insights screen.
 * - Period boundary calculation (UTC-based, matching backend).
 * - Chart label formatting.
 * - Percentage/delta helpers.
 */

export type TimeRange = 'week' | 'month' | '3months' | '1year';

export interface PeriodBounds {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  label: string;
  calendarDays: number;
}

/**
 * Returns today's date in YYYY-MM-DD UTC format.
 * Using UTC avoids local-timezone date boundary shifts between
 * the device and the backend (which uses UTC).
 */
export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Computes start/end dates for a given TimeRange.
 * All dates are in YYYY-MM-DD UTC format.
 */
export function getPeriodBounds(range: TimeRange): PeriodBounds {
  const now = new Date();
  const endDate = now.toISOString().slice(0, 10);

  let startDate: string;
  let label: string;

  switch (range) {
    case 'week': {
      // Monday of the current ISO week (UTC)
      const dayOfWeek = now.getUTCDay(); // 0 = Sun, 1 = Mon … 6 = Sat
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(now);
      monday.setUTCDate(now.getUTCDate() - daysToMonday);
      startDate = monday.toISOString().slice(0, 10);
      label = 'This Week';
      break;
    }
    case 'month': {
      const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      startDate = first.toISOString().slice(0, 10);
      label = 'This Month';
      break;
    }
    case '3months': {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1));
      startDate = d.toISOString().slice(0, 10);
      label = '3 Months';
      break;
    }
    case '1year': {
      const d = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), now.getUTCDate() + 1));
      startDate = d.toISOString().slice(0, 10);
      label = '1 Year';
      break;
    }
  }

  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  const calendarDays = Math.max(
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
    1
  );

  return { startDate, endDate, label, calendarDays };
}

/**
 * Formats a time-series label for display on chart x-axis.
 * day: "2026-10-15" → "15 Oct"  (for week/month)
 * week: "2026-10-07" → "7 Oct"
 * month: "2026-10" → "Oct"
 */
export function formatChartLabel(label: string, granularity: 'day' | 'week' | 'month'): string {
  try {
    if (granularity === 'month') {
      const [year, month] = label.split('-');
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      return d.toLocaleDateString('en-IN', { month: 'short' });
    }
    // day or week
    const d = new Date(`${label}T00:00:00.000Z`);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return label;
  }
}

/**
 * Computes the percentage change from prevValue to currValue.
 * Returns null when both are zero (no change).
 * Returns null (isNew) when prevValue is 0 and currValue > 0.
 */
export function percentageChange(
  curr: number,
  prev: number
): { value: number; isNew: boolean } | null {
  if (prev === 0 && curr === 0) return null;
  if (prev === 0) return { value: 0, isNew: true };
  return { value: ((curr - prev) / prev) * 100, isNew: false };
}

/**
 * Clamps a progress bar percentage to [minPct, 100].
 */
export function clampPct(pct: number, minPct = 3): number {
  if (pct <= 0) return 0;
  return Math.min(Math.max(pct, minPct), 100);
}

/**
 * Selects axis labels to avoid overcrowding.
 * maxLabels: maximum number of labels to show.
 */
export function selectAxisLabels<T>(items: T[], maxLabels: number): (T | null)[] {
  if (items.length <= maxLabels) return items;
  const result: (T | null)[] = new Array(items.length).fill(null);
  const step = Math.ceil(items.length / maxLabels);
  for (let i = 0; i < items.length; i += step) {
    result[i] = items[i];
  }
  // Always show last label
  result[items.length - 1] = items[items.length - 1];
  return result;
}
