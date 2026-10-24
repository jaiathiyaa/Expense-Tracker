import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { theme } from '../../theme';

const SkeletonBox: React.FC<{
  width?: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}> = ({ width = '100%', height, borderRadius = theme.borderRadius.sm, style }) => {
  return (
    <View
      style={[
        styles.skeleton,
        { width: width as any, height, borderRadius },
        style,
      ]}
    />
  );
};

const CardSkeleton: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.card}>{children}</View>
);

export const InsightsSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Time range selector */}
      <View style={styles.selectorRow}>
        <SkeletonBox height={38} borderRadius={theme.borderRadius.lg} />
      </View>

      {/* Summary cards */}
      <View style={styles.row}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.summaryCard}>
            <SkeletonBox width={32} height={32} borderRadius={16} style={styles.mb8} />
            <SkeletonBox width="80%" height={14} style={styles.mb4} />
            <SkeletonBox width="60%" height={10} />
          </View>
        ))}
      </View>

      {/* Trend chart */}
      <View style={styles.px}>
        <CardSkeleton>
          <SkeletonBox width="50%" height={14} style={styles.mb8} />
          <SkeletonBox height={110} borderRadius={theme.borderRadius.md} />
        </CardSkeleton>
      </View>

      {/* Category breakdown */}
      <View style={styles.px}>
        <CardSkeleton>
          <SkeletonBox width="60%" height={14} style={styles.mb12} />
          <View style={styles.row}>
            <SkeletonBox width={110} height={110} borderRadius={55} />
            <View style={{ flex: 1, marginLeft: 12, gap: 10 }}>
              {[0, 1, 2, 3].map((i) => (
                <SkeletonBox key={i} height={12} width={`${70 - i * 10}%`} />
              ))}
            </View>
          </View>
          <View style={[styles.mb8, { marginTop: 16 }]}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ marginBottom: 12 }}>
                <SkeletonBox height={12} width="100%" style={{ marginBottom: 6 }} />
                <SkeletonBox height={5} width={`${80 - i * 15}%`} />
              </View>
            ))}
          </View>
        </CardSkeleton>
      </View>

      {/* Period comparison */}
      <View style={styles.px}>
        <CardSkeleton>
          <SkeletonBox width="55%" height={14} style={styles.mb12} />
          <SkeletonBox height={54} borderRadius={theme.borderRadius.md} style={styles.mb8} />
          <SkeletonBox height={90} borderRadius={theme.borderRadius.sm} />
        </CardSkeleton>
      </View>

      {/* Top merchants */}
      <View style={styles.px}>
        <CardSkeleton>
          <SkeletonBox width="50%" height={14} style={styles.mb12} />
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.row, { marginBottom: 12 }]}>
              <SkeletonBox width={26} height={26} borderRadius={13} />
              <SkeletonBox width={28} height={28} borderRadius={14} style={{ marginLeft: 8 }} />
              <View style={{ flex: 1, marginLeft: 8, gap: 4 }}>
                <SkeletonBox height={12} width="70%" />
                <SkeletonBox height={9} width="45%" />
              </View>
              <SkeletonBox width={60} height={12} />
            </View>
          ))}
        </CardSkeleton>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skeleton: {
    backgroundColor: theme.colors.border,
  },
  selectorRow: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  px: {
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  mb4: { marginBottom: 4 },
  mb8: { marginBottom: 8 },
  mb12: { marginBottom: 12 },
});
