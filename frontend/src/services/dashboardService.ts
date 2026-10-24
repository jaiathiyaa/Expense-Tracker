import { API_CONFIG } from '../api/config';
import { ApiError, ApiErrorResponse } from '../api/types';

export interface DashboardSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
}

export interface CategoryItem {
  category: string | null;
  total: number;
}

export interface MonthlySummaryItem {
  month: string;
  income: number;
  expenses: number;
  balance: number;
}

export interface TransactionItem {
  id: string;
  title: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  description?: string | null;
  date: string;
  category?: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionPayload {
  title: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category?: string;
  description?: string;
  date?: string;
}

async function authenticatedRequest<T>(
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

    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let data: any = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { message: text };
    }

    if (!response.ok) {
      const errorMessage =
        (data as ApiErrorResponse)?.error ||
        (data as ApiErrorResponse)?.message ||
        `Request failed with status ${response.status}`;
      throw new ApiError(errorMessage, response.status, data);
    }

    return data as T;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error.name === 'AbortError') {
      throw new ApiError('Dashboard request timed out. Please retry.', 408);
    }

    throw new ApiError(
      error.message || 'Unable to load dashboard data. Please check connection.',
      0
    );
  }
}

export const dashboardService = {
  /**
   * Fetches total income, total expenses and balance
   */
  async getSummary(token: string): Promise<DashboardSummary> {
    return authenticatedRequest<DashboardSummary>('/dashboard/summary', token);
  },

  /**
   * Fetches spending by category breakdown
   */
  async getCategories(token: string): Promise<{ categories: CategoryItem[] }> {
    return authenticatedRequest<{ categories: CategoryItem[] }>(
      '/dashboard/categories',
      token
    );
  },

  /**
   * Fetches 6-month historical monthly income, expenses, and balance
   */
  async getMonthlySummary(
    token: string
  ): Promise<{ monthlySummary: MonthlySummaryItem[] }> {
    return authenticatedRequest<{ monthlySummary: MonthlySummaryItem[] }>(
      '/dashboard/monthly-summary',
      token
    );
  },

  /**
   * Fetches latest transactions (ordered by date desc)
   */
  async getRecentTransactions(
    token: string,
    limit: number = 4
  ): Promise<{ data: TransactionItem[] }> {
    return authenticatedRequest<{ data: TransactionItem[] }>(
      `/transactions?limit=${limit}&sortBy=date&order=desc`,
      token
    );
  },

  /**
   * Creates a transaction (for quick actions)
   */
  async createTransaction(
    token: string,
    payload: CreateTransactionPayload
  ): Promise<TransactionItem> {
    return authenticatedRequest<TransactionItem>('/transactions', token, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Fetches all dashboard data in parallel
   */
  async fetchAllDashboardData(token: string): Promise<{
    summary: DashboardSummary;
    categories: CategoryItem[];
    monthlySummary: MonthlySummaryItem[];
    recentTransactions: TransactionItem[];
  }> {
    const [summaryRes, categoriesRes, monthlyRes, transactionsRes] =
      await Promise.all([
        this.getSummary(token),
        this.getCategories(token),
        this.getMonthlySummary(token),
        this.getRecentTransactions(token, 4),
      ]);

    return {
      summary: summaryRes,
      categories: categoriesRes.categories || [],
      monthlySummary: monthlyRes.monthlySummary || [],
      recentTransactions: transactionsRes.data || [],
    };
  },
};
