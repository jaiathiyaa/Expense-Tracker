import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { insightsService, AnalyticsResponse } from '../services/insightsService';
import { TimeRange, getPeriodBounds } from '../utils/insightsHelpers';
import { TimeRangeSelector } from '../components/insights/TimeRangeSelector';
import { InsightsSummaryCards } from '../components/insights/InsightsSummaryCards';
import { SpendingTrendChart } from '../components/insights/SpendingTrendChart';
import { InsightsCategoryBreakdown } from '../components/insights/InsightsCategoryBreakdown';
import { PeriodComparison } from '../components/insights/PeriodComparison';
import { TopMerchants } from '../components/insights/TopMerchants';
import { InsightsSkeleton } from '../components/insights/InsightsSkeleton';

export const InsightsScreen: React.FC = () => {
  const { token, logout } = useAuth();

  const [selectedRange, setSelectedRange] = useState<TimeRange>('month');
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prevent duplicate requests when range changes quickly
  const requestIdRef = useRef(0);

  const fetchAnalytics = useCallback(
    async (range: TimeRange, isRefresh = false) => {
      if (!token) return;

      // Stamp this request; stale responses will be discarded
      const myId = ++requestIdRef.current;

      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
        setData(null);
      }
      setError(null);

      try {
        const { startDate, endDate } = getPeriodBounds(range);
        const result = await insightsService.getAnalytics(token, startDate, endDate);

        if (myId !== requestIdRef.current) return; // superseded

        setData(result);
      } catch (err: any) {
        if (myId !== requestIdRef.current) return;

        if (err.status === 401) {
          // Expired session — log out cleanly
          logout();
          return;
        }
        setError(err.message || 'Unable to load analytics. Please retry.');
      } finally {
        if (myId === requestIdRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [token, logout]
  );

  // Refresh whenever the screen comes into focus (handles post-add-transaction refresh)
  useFocusEffect(
    useCallback(() => {
      fetchAnalytics(selectedRange, true);
    }, [fetchAnalytics, selectedRange])
  );

  const handleRangeChange = (range: TimeRange) => {
    setSelectedRange(range);
    fetchAnalytics(range);
  };

  const handleRetry = () => {
    fetchAnalytics(selectedRange);
  };

  const period = getPeriodBounds(selectedRange);

  // ─── Loading state ─────────────────────────────────────────────────────────
  if (isLoading && !isRefreshing) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.headerRow}>
          <Text style={styles.screenTitle}>Insights</Text>
        </View>
        <InsightsSkeleton />
      </SafeAreaView>
    );
  }

  // ─── Error state ────────────────────────────────────────────────────────────
  if (error && !data) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.headerRow}>
          <Text style={styles.screenTitle}>Insights</Text>
        </View>
        <TimeRangeSelector selected={selectedRange} onSelect={handleRangeChange} />
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={theme.colors.textMuted} />
          <Text style={styles.errorTitle}>Unable to load analytics</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Retry loading analytics"
          >
            <Ionicons name="refresh" size={16} color="#FFFFFF" />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Main render ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Fixed header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.screenTitle}>Insights</Text>
          <Text style={styles.screenSubtitle}>{period.label} · {period.startDate} – {period.endDate}</Text>
        </View>
        {isRefreshing && (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchAnalytics(selectedRange, true)}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Error banner (partial data available) */}
        {error && data && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning-outline" size={16} color="#92400E" />
            <Text style={styles.errorBannerText}>{error}</Text>
            <TouchableOpacity onPress={handleRetry}>
              <Text style={styles.errorBannerRetry}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ① Time range selector */}
        <TimeRangeSelector selected={selectedRange} onSelect={handleRangeChange} />

        {data ? (
          <>
            {/* ② Summary metric cards */}
            <InsightsSummaryCards
              summary={data.summary}
              periodLabel={period.label}
            />

            {/* ③ Spending trend chart */}
            <SpendingTrendChart
              timeSeries={data.timeSeries}
              granularity={data.period.granularity}
              periodLabel={period.label}
            />

            {/* ④ Category breakdown */}
            <InsightsCategoryBreakdown
              categories={data.categories}
              totalSpending={data.summary.totalSpending}
            />

            {/* ⑤ vs Previous period */}
            <PeriodComparison
              categories={data.categories}
              prevCategories={data.prevCategories}
              totalSpending={data.summary.totalSpending}
              prevTotalSpending={data.prevSummary.totalSpending}
              periodLabel={period.label}
            />

            {/* ⑥ Top merchants */}
            <TopMerchants merchants={data.topMerchants} />

            {/* Transaction count footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {data.summary.transactionCount} expense{data.summary.transactionCount !== 1 ? 's' : ''} in {period.label.toLowerCase()}
              </Text>
            </View>
          </>
        ) : (
          // Show skeleton during refresh when no previous data
          <InsightsSkeleton />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
  },
  screenTitle: {
    ...theme.typography.title,
    color: theme.colors.textPrimary,
    fontSize: 24,
  },
  screenSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  scrollContent: {
    paddingBottom: 100, // clearance above bottom tab bar
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    paddingBottom: 80,
  },
  errorTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  errorSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    lineHeight: 18,
    marginBottom: theme.spacing.xl,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.xs,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 11,
    color: '#92400E',
    fontWeight: '500',
  },
  errorBannerRetry: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
    textDecorationLine: 'underline',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  footerText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
});
