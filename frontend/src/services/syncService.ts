import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { offlineStorage, PendingTransactionRecord } from './offlineStorage';
import { transactionService } from './transactionService';
import { ApiError } from '../api/types';

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  syncError: string | null;
  lastSyncTime: Date | null;
}

type SyncListener = (state: SyncState) => void;

class SyncService {
  private isOnline: boolean = true;
  private isSyncing: boolean = false;
  private currentUserId: string | null = null;
  private currentToken: string | null = null;
  private syncError: string | null = null;
  private lastSyncTime: Date | null = null;
  private listeners: Set<SyncListener> = new Set();
  private isNetInfoListening: boolean = false;

  constructor() {
    this.initNetInfo();
  }

  /**
   * Subscribes to sync state changes
   */
  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getStateSync());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const state = this.getStateSync();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error('[SyncService] Error in sync state listener:', err);
      }
    });
  }

  public getStateSync(): SyncState {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount: 0, // async fetched when notify happens or through getFullState
      failedCount: 0,
      syncError: this.syncError,
      lastSyncTime: this.lastSyncTime,
    };
  }

  public async getFullState(): Promise<SyncState> {
    let pendingCount = 0;
    let failedCount = 0;
    if (this.currentUserId) {
      const items = await offlineStorage.getPendingTransactions(this.currentUserId);
      pendingCount = items.filter((i) => i.status !== 'failed').length;
      failedCount = items.filter((i) => i.status === 'failed').length;
    }
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount,
      failedCount,
      syncError: this.syncError,
      lastSyncTime: this.lastSyncTime,
    };
  }

  /**
   * Sets current active authentication session info
   */
  setSession(token: string | null, userId: string | null) {
    const userChanged = this.currentUserId !== userId;
    this.currentToken = token;
    this.currentUserId = userId;

    if (userChanged) {
      this.syncError = null;
    }

    if (token && userId && this.isOnline) {
      // Opportunistically sync pending items for the user
      this.syncPendingTransactions();
    } else {
      this.notify();
    }
  }

  /**
   * Initializes network connectivity listener
   */
  private initNetInfo() {
    if (this.isNetInfoListening) return;
    this.isNetInfoListening = true;

    NetInfo.fetch().then((state) => {
      this.updateOnlineStatus(state);
    });

    NetInfo.addEventListener((state) => {
      const wasOffline = !this.isOnline;
      this.updateOnlineStatus(state);

      // If transition from offline to online and authenticated, trigger sync
      if (wasOffline && this.isOnline && this.currentToken && this.currentUserId) {
        console.log('[SyncService] Device is back online. Auto-triggering pending sync.');
        this.syncPendingTransactions();
      }
    });
  }

  private updateOnlineStatus(state: NetInfoState) {
    const online = Boolean(state.isConnected && state.isInternetReachable !== false);
    if (this.isOnline !== online) {
      this.isOnline = online;
      this.notify();
    }
  }

  /**
   * Manually checks server reachability
   */
  public async checkConnectivity(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      this.isOnline = online;
      this.notify();
      return online;
    } catch {
      return this.isOnline;
    }
  }

  /**
   * Processes all pending transactions for the current user
   * Prevents concurrent sync runs via mutex flag
   */
  public async syncPendingTransactions(): Promise<{
    syncedCount: number;
    failedCount: number;
    errors: string[];
  }> {
    if (this.isSyncing) {
      console.log('[SyncService] Sync already in progress, skipping concurrent trigger.');
      return { syncedCount: 0, failedCount: 0, errors: [] };
    }

    if (!this.currentToken || !this.currentUserId) {
      return { syncedCount: 0, failedCount: 0, errors: ['Not authenticated.'] };
    }

    this.isSyncing = true;
    this.syncError = null;
    this.notify();

    let syncedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    try {
      const pendingItems = await offlineStorage.getPendingTransactions(this.currentUserId);

      if (pendingItems.length === 0) {
        this.isSyncing = false;
        this.lastSyncTime = new Date();
        this.notify();
        return { syncedCount: 0, failedCount: 0, errors: [] };
      }

      console.log(`[SyncService] Starting sync for ${pendingItems.length} pending transaction(s)...`);

      for (const item of pendingItems) {
        // Mark as syncing in persistent storage
        await offlineStorage.updatePendingStatus(item.clientTxId, 'syncing');
        this.notify();

        try {
          // Send request with clientTxId to guarantee idempotency
          const serverTx = await transactionService.createTransaction(this.currentToken, {
            clientTxId: item.clientTxId,
            title: item.title,
            amount: item.amount,
            type: item.type,
            category: item.category || undefined,
            description: item.description || undefined,
            date: item.date,
          });

          // Reconcile pending transaction with server record in local SQLite cache
          await offlineStorage.reconcilePendingWithServer(item.clientTxId, serverTx);
          syncedCount++;
          console.log(`[SyncService] Successfully synced "${item.title}" (${item.clientTxId}) -> server id: ${serverTx.id}`);
        } catch (err: any) {
          const isAuthError = err.status === 401;

          if (isAuthError) {
            // Keep pending data safe; pause sync until user logs back in
            console.warn('[SyncService] Auth session expired during sync. Preserving pending transaction.');
            await offlineStorage.updatePendingStatus(
              item.clientTxId,
              'pending',
              'Authentication expired. Pending changes preserved.'
            );
            this.syncError = 'Session expired. Please log in to complete synchronization.';
            errors.push(this.syncError);
            failedCount++;
            break; // Stop loop, do not spam server with invalid token
          }

          const errorMessage = err.message || 'Network connection failed during sync.';
          await offlineStorage.updatePendingStatus(item.clientTxId, 'failed', errorMessage);
          failedCount++;
          errors.push(errorMessage);
          console.error(`[SyncService] Failed to sync "${item.title}":`, errorMessage);
        }
      }

      this.lastSyncTime = new Date();
      if (errors.length > 0) {
        this.syncError = errors[0];
      }
    } catch (err: any) {
      console.error('[SyncService] Unexpected error in sync runner:', err);
      this.syncError = err.message || 'Failed to complete synchronization.';
    } finally {
      this.isSyncing = false;
      this.notify();
    }

    return { syncedCount, failedCount, errors };
  }

  /**
   * Manually retries all failed transactions
   */
  public async retryFailed(): Promise<void> {
    if (!this.currentUserId) return;
    const items = await offlineStorage.getPendingTransactions(this.currentUserId);
    for (const item of items) {
      if (item.status === 'failed') {
        await offlineStorage.updatePendingStatus(item.clientTxId, 'pending', null);
      }
    }
    this.syncError = null;
    await this.syncPendingTransactions();
  }
}

export const syncService = new SyncService();
