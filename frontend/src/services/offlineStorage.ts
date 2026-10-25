import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { TransactionItem, SyncStatus } from './dashboardService';
import { User } from '../api/types';

export interface PendingTransactionRecord {
  clientTxId: string;
  userId: string;
  title: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category?: string | null;
  description?: string | null;
  date: string;
  status: SyncStatus;
  createdAt: string;
  lastAttemptedAt?: string | null;
  retryCount: number;
  errorMessage?: string | null;
}

export function generateClientTxId(): string {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 10);
  const perfPart = typeof performance !== 'undefined' ? Math.floor(performance.now() * 1000) % 100000 : Math.floor(Math.random() * 100000);
  return `tx_${timestamp}_${perfPart}_${randomPart}`;
}

const DB_NAME = 'expense_tracker.db';

// Fallback in-memory/web store if SQLite native module is unavailable (e.g. web browser)
class MemoryStore {
  cachedTransactions: Map<string, TransactionItem> = new Map();
  pendingTransactions: Map<string, PendingTransactionRecord> = new Map();
  cachedProfiles: Map<string, User> = new Map();
  lastActiveUserId: string | null = null;
}

const memoryStore = new MemoryStore();

let sqliteDbInstance: SQLite.SQLiteDatabase | null = null;
let isDbInitialized = false;

async function getDb(): Promise<SQLite.SQLiteDatabase | null> {
  if (Platform.OS === 'web') {
    return null;
  }
  try {
    if (!sqliteDbInstance) {
      sqliteDbInstance = await SQLite.openDatabaseAsync(DB_NAME);
    }
    return sqliteDbInstance;
  } catch (err) {
    console.warn('[offlineStorage] SQLite.openDatabaseAsync failed, falling back to memory/local store:', err);
    return null;
  }
}

export const offlineStorage = {
  /**
   * Initializes SQLite tables if running on native device
   */
  async init(): Promise<void> {
    if (isDbInitialized) return;

    const db = await getDb();
    if (!db) {
      isDbInitialized = true;
      return;
    }

    try {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS cached_transactions (
          id TEXT PRIMARY KEY,
          clientTxId TEXT,
          title TEXT NOT NULL,
          amount REAL NOT NULL,
          type TEXT NOT NULL,
          category TEXT,
          description TEXT,
          date TEXT NOT NULL,
          userId TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_cached_user_date ON cached_transactions(userId, date DESC);

        CREATE TABLE IF NOT EXISTS pending_transactions (
          clientTxId TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          title TEXT NOT NULL,
          amount REAL NOT NULL,
          type TEXT NOT NULL,
          category TEXT,
          description TEXT,
          date TEXT NOT NULL,
          status TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          lastAttemptedAt TEXT,
          retryCount INTEGER NOT NULL DEFAULT 0,
          errorMessage TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_pending_user_status ON pending_transactions(userId, status, createdAt ASC);

        CREATE TABLE IF NOT EXISTS cached_user_profiles (
          userId TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        );
      `);
      isDbInitialized = true;
    } catch (err) {
      console.error('[offlineStorage] Error initializing SQLite database schema:', err);
    }
  },

  /**
   * Caches server transactions for a specific user
   */
  async cacheTransactions(userId: string, items: TransactionItem[]): Promise<void> {
    if (!userId || !items) return;
    await this.init();

    const db = await getDb();
    if (!db) {
      for (const item of items) {
        if (item.userId === userId) {
          memoryStore.cachedTransactions.set(`${userId}:${item.id}`, { ...item, syncStatus: 'synced' });
        }
      }
      return;
    }

    try {
      await db.withTransactionAsync(async () => {
        for (const item of items) {
          await db.runAsync(
            `INSERT OR REPLACE INTO cached_transactions 
             (id, clientTxId, title, amount, type, category, description, date, userId, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              item.id,
              item.clientTxId || null,
              item.title,
              item.amount,
              item.type,
              item.category || null,
              item.description || null,
              item.date,
              userId,
              item.createdAt || new Date().toISOString(),
              item.updatedAt || new Date().toISOString(),
            ]
          );
        }
      });
    } catch (err) {
      console.error('[offlineStorage] Failed to cache transactions in SQLite:', err);
    }
  },

  /**
   * Retrieves cached server transactions for a user with optional filtering
   */
  async getCachedTransactions(
    userId: string,
    filters?: {
      type?: 'INCOME' | 'EXPENSE';
      startDate?: string;
      endDate?: string;
    }
  ): Promise<TransactionItem[]> {
    if (!userId) return [];
    await this.init();

    const db = await getDb();
    if (!db) {
      let results = Array.from(memoryStore.cachedTransactions.values()).filter(
        (t) => t.userId === userId
      );
      if (filters?.type) {
        results = results.filter((t) => t.type === filters.type);
      }
      if (filters?.startDate && filters?.endDate) {
        results = results.filter((t) => t.date >= filters.startDate! && t.date <= filters.endDate!);
      }
      return results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    try {
      let query = `SELECT * FROM cached_transactions WHERE userId = ?`;
      const params: any[] = [userId];

      if (filters?.type) {
        query += ` AND type = ?`;
        params.push(filters.type);
      }
      if (filters?.startDate && filters?.endDate) {
        query += ` AND date >= ? AND date <= ?`;
        params.push(filters.startDate, filters.endDate);
      }

      query += ` ORDER BY date DESC, createdAt DESC`;

      const rows = await db.getAllAsync<any>(query, params);
      return rows.map((r) => ({
        id: r.id,
        clientTxId: r.clientTxId,
        title: r.title,
        amount: Number(r.amount),
        type: r.type,
        category: r.category,
        description: r.description,
        date: r.date,
        userId: r.userId,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        syncStatus: 'synced',
      }));
    } catch (err) {
      console.error('[offlineStorage] Failed to get cached transactions:', err);
      return [];
    }
  },

  /**
   * Stores a pending local transaction
   */
  async savePendingTransaction(record: PendingTransactionRecord): Promise<void> {
    await this.init();

    const db = await getDb();
    if (!db) {
      memoryStore.pendingTransactions.set(record.clientTxId, { ...record });
      return;
    }

    try {
      await db.runAsync(
        `INSERT OR REPLACE INTO pending_transactions
         (clientTxId, userId, title, amount, type, category, description, date, status, createdAt, lastAttemptedAt, retryCount, errorMessage)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          record.clientTxId,
          record.userId,
          record.title,
          record.amount,
          record.type,
          record.category || null,
          record.description || null,
          record.date,
          record.status,
          record.createdAt,
          record.lastAttemptedAt || null,
          record.retryCount || 0,
          record.errorMessage || null,
        ]
      );
    } catch (err) {
      console.error('[offlineStorage] Failed to save pending transaction:', err);
      throw err;
    }
  },

  /**
   * Retrieves all pending transactions for a user, ordered by creation time (FIFO)
   */
  async getPendingTransactions(userId: string): Promise<PendingTransactionRecord[]> {
    if (!userId) return [];
    await this.init();

    const db = await getDb();
    if (!db) {
      return Array.from(memoryStore.pendingTransactions.values())
        .filter((r) => r.userId === userId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }

    try {
      const rows = await db.getAllAsync<any>(
        `SELECT * FROM pending_transactions WHERE userId = ? ORDER BY createdAt ASC;`,
        [userId]
      );
      return rows.map((r) => ({
        clientTxId: r.clientTxId,
        userId: r.userId,
        title: r.title,
        amount: Number(r.amount),
        type: r.type,
        category: r.category,
        description: r.description,
        date: r.date,
        status: r.status as SyncStatus,
        createdAt: r.createdAt,
        lastAttemptedAt: r.lastAttemptedAt,
        retryCount: Number(r.retryCount),
        errorMessage: r.errorMessage,
      }));
    } catch (err) {
      console.error('[offlineStorage] Failed to get pending transactions:', err);
      return [];
    }
  },

  /**
   * Updates status, retryCount, and error message for a pending transaction
   */
  async updatePendingStatus(
    clientTxId: string,
    status: SyncStatus,
    errorMessage?: string | null
  ): Promise<void> {
    await this.init();

    const db = await getDb();
    if (!db) {
      const existing = memoryStore.pendingTransactions.get(clientTxId);
      if (existing) {
        existing.status = status;
        existing.lastAttemptedAt = new Date().toISOString();
        if (status === 'failed') {
          existing.retryCount += 1;
          existing.errorMessage = errorMessage || null;
        } else if (status === 'syncing') {
          existing.errorMessage = null;
        }
      }
      return;
    }

    try {
      const now = new Date().toISOString();
      if (status === 'failed') {
        await db.runAsync(
          `UPDATE pending_transactions 
           SET status = ?, lastAttemptedAt = ?, retryCount = retryCount + 1, errorMessage = ?
           WHERE clientTxId = ?;`,
          [status, now, errorMessage || null, clientTxId]
        );
      } else {
        await db.runAsync(
          `UPDATE pending_transactions 
           SET status = ?, lastAttemptedAt = ?, errorMessage = NULL
           WHERE clientTxId = ?;`,
          [status, now, clientTxId]
        );
      }
    } catch (err) {
      console.error('[offlineStorage] Failed to update pending status:', err);
    }
  },

  /**
   * Deletes a pending transaction by clientTxId
   */
  async deletePendingTransaction(clientTxId: string): Promise<void> {
    await this.init();

    const db = await getDb();
    if (!db) {
      memoryStore.pendingTransactions.delete(clientTxId);
      return;
    }

    try {
      await db.runAsync(`DELETE FROM pending_transactions WHERE clientTxId = ?;`, [clientTxId]);
    } catch (err) {
      console.error('[offlineStorage] Failed to delete pending transaction:', err);
    }
  },

  /**
   * Atomically reconciles a successfully synced pending record with the server record:
   * Removes from pending_transactions and inserts into cached_transactions
   */
  async reconcilePendingWithServer(
    clientTxId: string,
    serverTx: TransactionItem
  ): Promise<void> {
    await this.init();

    const db = await getDb();
    if (!db) {
      memoryStore.pendingTransactions.delete(clientTxId);
      memoryStore.cachedTransactions.set(`${serverTx.userId}:${serverTx.id}`, {
        ...serverTx,
        syncStatus: 'synced',
      });
      return;
    }

    try {
      await db.withTransactionAsync(async () => {
        // Remove pending
        await db.runAsync(`DELETE FROM pending_transactions WHERE clientTxId = ?;`, [clientTxId]);

        // Insert into cache
        await db.runAsync(
          `INSERT OR REPLACE INTO cached_transactions 
           (id, clientTxId, title, amount, type, category, description, date, userId, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            serverTx.id,
            serverTx.clientTxId || clientTxId,
            serverTx.title,
            serverTx.amount,
            serverTx.type,
            serverTx.category || null,
            serverTx.description || null,
            serverTx.date,
            serverTx.userId,
            serverTx.createdAt || new Date().toISOString(),
            serverTx.updatedAt || new Date().toISOString(),
          ]
        );
      });
    } catch (err) {
      console.error('[offlineStorage] Failed to reconcile pending transaction with server:', err);
    }
  },

  /**
   * Caches user profile for offline authentication continuity
   */
  async cacheUserProfile(user: User): Promise<void> {
    if (!user || !user.id) return;
    await this.init();

    const db = await getDb();
    if (!db) {
      memoryStore.cachedProfiles.set(user.id, user);
      memoryStore.lastActiveUserId = user.id;
      return;
    }

    try {
      await db.runAsync(
        `INSERT OR REPLACE INTO cached_user_profiles (userId, name, email, updatedAt) VALUES (?, ?, ?, ?);`,
        [user.id, user.name, user.email, new Date().toISOString()]
      );
    } catch (err) {
      console.error('[offlineStorage] Failed to cache user profile:', err);
    }
  },

  /**
   * Retrieves cached user profile
   */
  async getCachedUserProfile(userId?: string): Promise<User | null> {
    await this.init();

    const db = await getDb();
    if (!db) {
      if (userId) {
        return memoryStore.cachedProfiles.get(userId) || null;
      }
      if (memoryStore.lastActiveUserId) {
        return memoryStore.cachedProfiles.get(memoryStore.lastActiveUserId) || null;
      }
      const all = Array.from(memoryStore.cachedProfiles.values());
      return all.length > 0 ? all[0] : null;
    }

    try {
      let row: any = null;
      if (userId) {
        row = await db.getFirstAsync<any>(
          `SELECT * FROM cached_user_profiles WHERE userId = ?;`,
          [userId]
        );
      } else {
        row = await db.getFirstAsync<any>(
          `SELECT * FROM cached_user_profiles ORDER BY updatedAt DESC LIMIT 1;`
        );
      }

      if (!row) return null;
      return {
        id: row.userId,
        name: row.name,
        email: row.email,
        createdAt: row.updatedAt,
      };
    } catch (err) {
      console.error('[offlineStorage] Failed to retrieve cached user profile:', err);
      return null;
    }
  },

  /**
   * Converts a pending transaction record into a UI-renderable TransactionItem
   */
  pendingToTransactionItem(record: PendingTransactionRecord): TransactionItem {
    return {
      id: record.clientTxId, // temporary client id until reconciled
      clientTxId: record.clientTxId,
      title: record.title,
      amount: record.amount,
      type: record.type,
      category: record.category,
      description: record.description,
      date: record.date,
      userId: record.userId,
      createdAt: record.createdAt,
      updatedAt: record.createdAt,
      syncStatus: record.status,
      syncError: record.errorMessage || undefined,
    };
  },
};
