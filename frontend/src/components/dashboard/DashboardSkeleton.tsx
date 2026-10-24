import React from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { theme } from '../../theme';

export const DashboardSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Header skeleton */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={[styles.skeletonBlock, { width: 100, height: 16 }]} />
          <View style={[styles.skeletonBlock, { width: 160, height: 26, marginTop: 6 }]} />
        </View>
        <View style={[styles.skeletonBlock, { width: 42, height: 42, borderRadius: 21 }]} />
      </View>

      {/* Balance Card Skeleton */}
      <View style={[styles.balanceCardSkeleton, theme.shadows.medium]}>
        <View style={[styles.skeletonBlock, { width: 110, height: 16, backgroundColor: 'rgba(255,255,255,0.2)' }]} />
        <View style={[styles.skeletonBlock, { width: 220, height: 40, marginVertical: 12, backgroundColor: 'rgba(255,255,255,0.2)' }]} />
        <View style={[styles.skeletonBlock, { width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.15)' }]} />
        <View style={styles.cardBottomRow}>
          <View style={[styles.skeletonBlock, { width: 100, height: 24, backgroundColor: 'rgba(255,255,255,0.2)' }]} />
          <View style={[styles.skeletonBlock, { width: 100, height: 24, backgroundColor: 'rgba(255,255,255,0.2)' }]} />
        </View>
      </View>

      {/* Quick Actions Skeleton */}
      <View style={styles.quickActionsRow}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.actionCardSkeleton, theme.shadows.soft]}>
            <View style={[styles.skeletonBlock, { width: 44, height: 44, borderRadius: 22 }]} />
            <View style={[styles.skeletonBlock, { width: 50, height: 12, marginTop: 8 }]} />
          </View>
        ))}
      </View>

      {/* Center Spinner Notice */}
      <View style={styles.loadingCenter}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Syncing financial data...</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  headerLeft: {
    flex: 1,
  },
  skeletonBlock: {
    backgroundColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
  },
  balanceCardSkeleton: {
    marginHorizontal: theme.spacing.xl,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
  },
  quickActionsRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.xl,
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
  },
  actionCardSkeleton: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  loadingCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
  },
  loadingText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
  },
});
