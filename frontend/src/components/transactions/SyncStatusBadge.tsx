import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SyncStatus } from '../../services/dashboardService';

interface SyncStatusBadgeProps {
  status?: SyncStatus;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({ status }) => {
  if (!status || status === 'synced') {
    return null;
  }

  if (status === 'syncing') {
    return (
      <View style={[styles.badge, styles.syncingBadge]}>
        <Ionicons name="sync" size={10} color="#4338CA" style={styles.icon} />
        <Text style={[styles.text, styles.syncingText]}>Syncing</Text>
      </View>
    );
  }

  if (status === 'failed') {
    return (
      <View style={[styles.badge, styles.failedBadge]}>
        <Ionicons name="alert-circle" size={10} color="#DC2626" style={styles.icon} />
        <Text style={[styles.text, styles.failedText]}>Sync Failed</Text>
      </View>
    );
  }

  // Pending
  return (
    <View style={[styles.badge, styles.pendingBadge]}>
      <Ionicons name="cloud-upload-outline" size={10} color="#D97706" style={styles.icon} />
      <Text style={[styles.text, styles.pendingText]}>Pending Sync</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 3,
  },
  icon: {
    marginRight: 3,
  },
  text: {
    fontSize: 10,
    fontWeight: '600',
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
  },
  pendingText: {
    color: '#B45309',
  },
  syncingBadge: {
    backgroundColor: '#E0E7FF',
  },
  syncingText: {
    color: '#4338CA',
  },
  failedBadge: {
    backgroundColor: '#FEE2E2',
  },
  failedText: {
    color: '#DC2626',
  },
});
