import { API_CONFIG } from '../api/config';
import { ApiError, ApiErrorResponse } from '../api/types';
import { TransactionItem } from './dashboardService';

export interface GetTransactionsParams {
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'amount' | 'date';
  order?: 'asc' | 'desc';
  type?: 'INCOME' | 'EXPENSE';
  startDate?: string;
  endDate?: string;
}

export interface PaginatedTransactionsResponse {
  data: TransactionItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

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
    if (error instanceof ApiError) throw error;
    if (error.name === 'AbortError') {
      throw new ApiError('Request timed out. Please check connection.', 408);
    }
    throw new ApiError(error.message || 'Unable to connect to transactions API.', 0);
  }
}

export type { CreateTransactionPayload } from './dashboardService';
import { CreateTransactionPayload } from './dashboardService';

export const transactionService = {
  /**
   * Fetches paginated transactions with supported filters
   */
  async getTransactions(
    token: string,
    params: GetTransactionsParams = {}
  ): Promise<PaginatedTransactionsResponse> {
    const queryParts: string[] = [];

    if (params.page) queryParts.push(`page=${params.page}`);
    if (params.limit) queryParts.push(`limit=${params.limit}`);
    if (params.sortBy) queryParts.push(`sortBy=${params.sortBy}`);
    if (params.order) queryParts.push(`order=${params.order}`);
    if (params.type) queryParts.push(`type=${params.type}`);
    if (params.startDate) queryParts.push(`startDate=${params.startDate}`);
    if (params.endDate) queryParts.push(`endDate=${params.endDate}`);

    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    return authenticatedFetch<PaginatedTransactionsResponse>(
      `/transactions${queryString}`,
      token
    );
  },

  /**
   * Creates a new transaction
   */
  async createTransaction(
    token: string,
    payload: CreateTransactionPayload
  ): Promise<TransactionItem> {
    return authenticatedFetch<TransactionItem>('/transactions', token, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Deletes a transaction by ID
   */
  async deleteTransaction(token: string, id: string): Promise<{ message: string }> {
    return authenticatedFetch<{ message: string }>(`/transactions/${id}`, token, {
      method: 'DELETE',
    });
  },

  /**
   * Fetches the user's transactions as CSV text
   */
  async exportTransactionsCsv(token: string): Promise<string> {
    const url = `${API_CONFIG.BASE_URL}/transactions/export`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      let errMsg = 'Failed to export transactions.';
      try {
        const json = await response.json();
        errMsg = json.error || errMsg;
      } catch {}
      throw new ApiError(errMsg, response.status);
    }

    return await response.text();
  },
};

