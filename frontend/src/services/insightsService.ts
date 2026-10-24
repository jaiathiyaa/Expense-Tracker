import { API_CONFIG } from '../api/config';
import { ApiError, ApiErrorResponse } from '../api/types';

// ─── Response Types ──────────────────────────────────────────────────────────

export type InsightsGranularity = 'day' | 'week' | 'month';

export interface InsightsPeriod {
  startDate: string;
  endDate: string;
  calendarDays: number;
  granularity: InsightsGranularity;
}

export interface InsightsSummary {
  totalSpending: number;
  avgDailySpending: number;
  largestExpense: number;
  transactionCount: number;
}

export interface InsightsCategoryItem {
  category: string;
  total: number;
}

export interface InsightsTimeSeriesPoint {
  label: string; // YYYY-MM-DD (day/week) or YYYY-MM (month)
  total: number;
}

export interface InsightsMerchant {
  title: string;
  count: number;
  total: number;
  category: string | null;
}

export interface AnalyticsResponse {
  period: InsightsPeriod;
  summary: InsightsSummary;
  categories: InsightsCategoryItem[];
  prevCategories: InsightsCategoryItem[];
  prevSummary: { totalSpending: number };
  timeSeries: InsightsTimeSeriesPoint[];
  topMerchants: InsightsMerchant[];
}

// ─── Authenticated fetch helper ───────────────────────────────────────────────

async function authenticatedFetch<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...((options.headers as Record<string, string>) || {}),
    };

    const response = await fetch(url, { ...options, headers, signal: controller.signal });
    clearTimeout(timeoutId);

    let data: any = null;
    const ct = response.headers.get('content-type');
    if (ct && ct.includes('application/json')) {
      data = await response.json();
    } else {
      data = { message: await response.text() };
    }

    if (!response.ok) {
      const msg =
        (data as ApiErrorResponse)?.error ||
        (data as ApiErrorResponse)?.message ||
        `Request failed with status ${response.status}`;
      throw new ApiError(msg, response.status, data);
    }

    return data as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err instanceof ApiError) throw err;
    if (err.name === 'AbortError') {
      throw new ApiError('Analytics request timed out. Please retry.', 408);
    }
    throw new ApiError(err.message || 'Unable to connect to analytics API.', 0);
  }
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const insightsService = {
  /**
   * Fetches all period-specific analytics from the backend.
   * The backend computes aggregations server-side to avoid N-page pagination.
   */
  async getAnalytics(
    token: string,
    startDate: string,
    endDate: string
  ): Promise<AnalyticsResponse> {
    return authenticatedFetch<AnalyticsResponse>(
      `/dashboard/analytics?startDate=${startDate}&endDate=${endDate}`,
      token
    );
  },
};
