import { offlineStorage, generateClientTxId, PendingTransactionRecord } from './offlineStorage';
import { transactionService, GetTransactionsParams, PaginatedTransactionsResponse } from './transactionService';
import { TransactionItem, CreateTransactionPayload } from './dashboardService';
import { syncService } from './syncService';
import { ApiError } from '../api/types';

export interface CreateTransactionResult {
  transaction: TransactionItem;
  isOffline: boolean;
  message?: string;
}

export const offlineTransactionService = {
  /**
   * Creates a transaction using an offline-first strategy:
   * 1. Persists locally immediately as pending with a stable clientTxId.
   * 2. Attempts network push if online.
   * 3. Reconciles with server on success; remains queued on network failure.
   */
  async createTransaction(
    token: string | null,
    userId: string,
    payload: CreateTransactionPayload
  ): Promise<CreateTransactionResult> {
    const clientTxId = payload.clientTxId || generateClientTxId();
    const now = new Date().toISOString();
    const dateStr = payload.date || now;

    const pendingRecord: PendingTransactionRecord = {
      clientTxId,
      userId,
      title: payload.title.trim(),
      amount: payload.amount,
      type: payload.type,
      category: payload.category || null,
      description: payload.description || null,
      date: dateStr,
      status: 'pending',
      createdAt: now,
      lastAttemptedAt: null,
      retryCount: 0,
      errorMessage: null,
    };

    // 1. Persist locally first to guarantee zero data loss
    await offlineStorage.savePendingTransaction(pendingRecord);

    // 2. Check if we can attempt immediate submission
    const isOnline = syncService.getStateSync().isOnline;

    if (!isOnline || !token) {
      console.log(`[offlineTransactionService] Saved "${payload.title}" offline with clientTxId: ${clientTxId}`);
      return {
        transaction: offlineStorage.pendingToTransactionItem(pendingRecord),
        isOffline: true,
        message: 'Saved offline. Transaction will sync automatically when connected.',
      };
    }

    // 3. Attempt immediate online push
    try {
      const serverTx = await transactionService.createTransaction(token, {
        ...payload,
        clientTxId,
      });

      // Reconcile pending item with server response
      await offlineStorage.reconcilePendingWithServer(clientTxId, serverTx);

      return {
        transaction: { ...serverTx, syncStatus: 'synced' },
        isOffline: false,
      };
    } catch (err: any) {
      // If server is unreachable or temporary network failure, keep in queue
      console.warn(`[offlineTransactionService] Network push failed for ${clientTxId}, kept in pending queue:`, err.message);

      if (err.status === 401) {
        // Auth session expired
        await offlineStorage.updatePendingStatus(
          clientTxId,
          'pending',
          'Session expired. Pending transaction saved locally.'
        );
        throw err;
      }

      await offlineStorage.updatePendingStatus(
        clientTxId,
        'pending',
        err.message || 'Network unreachable'
      );

      return {
        transaction: offlineStorage.pendingToTransactionItem({
          ...pendingRecord,
          status: 'pending',
          errorMessage: err.message,
        }),
        isOffline: true,
        message: 'Saved locally. Will sync as soon as network is restored.',
      };
    }
  },

  /**
   * Retrieves merged list of transactions:
   * 1. Reads local cache and pending queue from SQLite.
   * 2. If online, refreshes server cache and reconciles.
   * 3. Merges and deduplicates (pending items overlay server cache).
   */
  async getTransactions(
    token: string | null,
    userId: string,
    params: GetTransactionsParams = {}
  ): Promise<PaginatedTransactionsResponse> {
    const isOnline = syncService.getStateSync().isOnline;

    // Load local cached & pending records
    const [cachedItems, pendingRecords] = await Promise.all([
      offlineStorage.getCachedTransactions(userId, {
        type: params.type,
        startDate: params.startDate,
        endDate: params.endDate,
      }),
      offlineStorage.getPendingTransactions(userId),
    ]);

    const pendingItems = pendingRecords.map(offlineStorage.pendingToTransactionItem);

    // If online and authenticated, attempt to fetch fresh transactions from server
    if (isOnline && token) {
      try {
        const serverResponse = await transactionService.getTransactions(token, params);

        // Update local cache with server items
        if (serverResponse.data && serverResponse.data.length > 0) {
          await offlineStorage.cacheTransactions(userId, serverResponse.data);
        }

        // Merge server response with active pending items
        const merged = this.mergeAndDeduplicate(serverResponse.data || [], pendingItems);

        return {
          data: merged,
          pagination: {
            ...serverResponse.pagination,
            total: serverResponse.pagination.total + pendingItems.length,
          },
        };
      } catch (err: any) {
        console.warn('[offlineTransactionService] Server fetch failed, falling back to local cache:', err.message);
        // Fall back to local SQLite cache
      }
    }

    // Offline or fallback: merge cached server records with pending items
    const mergedOffline = this.mergeAndDeduplicate(cachedItems, pendingItems);
    const limit = params.limit || 15;
    const page = params.page || 1;
    const offset = (page - 1) * limit;
    const paginatedSlice = mergedOffline.slice(offset, offset + limit);

    return {
      data: paginatedSlice,
      pagination: {
        total: mergedOffline.length,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(mergedOffline.length / limit)),
        hasNextPage: offset + limit < mergedOffline.length,
        hasPrevPage: page > 1,
      },
    };
  },

  /**
   * Deduplicates and orders transactions:
   * Pending transactions take precedence over matching clientTxIds,
   * and items are ordered by date descending.
   */
  mergeAndDeduplicate(
    serverOrCached: TransactionItem[],
    pending: TransactionItem[]
  ): TransactionItem[] {
    const pendingClientIds = new Set(pending.map((p) => p.clientTxId).filter(Boolean));
    const pendingIds = new Set(pending.map((p) => p.id));

    // Exclude any cached transactions that match a pending item's clientTxId or id
    const filteredCached = serverOrCached.filter(
      (item) =>
        (!item.clientTxId || !pendingClientIds.has(item.clientTxId)) &&
        !pendingIds.has(item.id)
    );

    // Pending transactions shown on top, followed by cached transactions sorted by date
    const combined = [...pending, ...filteredCached];
    return combined.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  },
};
