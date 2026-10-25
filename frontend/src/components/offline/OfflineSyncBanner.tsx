import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { syncService, SyncState } from '../../services/syncService';

export const OfflineSyncBanner: React.FC = () => {
  const [syncState, setSyncState] = useState<SyncState>(syncService.getStateSync());

  useEffect(() => {
    // Initial fetch of full count
    syncService.getFullState().then(setSyncState);

    const unsubscribe = syncService.subscribe((state) => {
      syncService.getFullState().then(setSyncState);
    });

    return unsubscribe;
  }, []);

  const handleRetry = () => {
    syncService.retryFailed();
  };

  // 1. Syncing in progress
  if (syncState.isSyncing) {
    return (
      <View style={[styles.container, styles.syncingContainer]}>
        <ActivityIndicator size="small" color={theme.colors.primary} style={styles.icon} />
        <Text style={[styles.text, styles.syncingText]}>
          Syncing {syncState.pendingCount > 0 ? `${syncState.pendingCount} transaction(s)...` : 'changes...'}
        </Text>
      </View>
    );
  }

  // 2. Failed sync attempts
  if (syncState.failedCount > 0 || (syncState.syncError && syncState.isOnline)) {
    return (
      <View style={[styles.container, styles.failedContainer]}>
        <View style={styles.leftContent}>
          <Ionicons name="alert-circle" size={18} color="#D97706" style={styles.icon} />
          <Text style={[styles.text, styles.failedText]} numberOfLines={1}>
            {syncState.syncError || `${syncState.failedCount} pending sync failed`}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={handleRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry syncing failed transactions"
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 3. Offline Mode
  if (!syncState.isOnline) {
    return (
      <View style={[styles.container, styles.offlineContainer]}>
        <Ionicons name="cloud-offline" size={18} color="#4B5563" style={styles.icon} />
        <Text style={[styles.text, styles.offlineText]}>
          Offline Mode
          {syncState.pendingCount > 0 ? ` • ${syncState.pendingCount} pending sync` : ' • Viewing cached data'}
        </Text>
      </View>
    );
  }

  // 4. Online with pending queue awaiting sync
  if (syncState.pendingCount > 0) {
    return (
      <View style={[styles.container, styles.pendingContainer]}>
        <Ionicons name="time-outline" size={18} color={theme.colors.primary} style={styles.icon} />
        <Text style={[styles.text, styles.pendingText]}>
          {syncState.pendingCount} transaction(s) pending sync
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => syncService.syncPendingTransactions()}
          accessibilityRole="button"
          accessibilityLabel="Sync pending transactions now"
        >
          <Text style={styles.retryText}>Sync Now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // All synchronized and online: no banner needed
  return null;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 1,
  },
  offlineContainer: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  offlineText: {
    color: '#374151',
  },
  syncingContainer: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  syncingText: {
    color: theme.colors.primary,
  },
  pendingContainer: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },
  pendingText: {
    color: theme.colors.primary,
  },
  failedContainer: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  failedText: {
    color: '#92400E',
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
