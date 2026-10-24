import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';
import {
  dashboardService,
  DashboardSummary,
  CategoryItem,
  MonthlySummaryItem,
  TransactionItem,
} from '../services/dashboardService';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { BalanceCard } from '../components/dashboard/BalanceCard';
import { QuickActions } from '../components/dashboard/QuickActions';
import { SpendingOverview } from '../components/dashboard/SpendingOverview';
import { CategoryBreakdown } from '../components/dashboard/CategoryBreakdown';
import { RecentTransactions } from '../components/dashboard/RecentTransactions';
import { DashboardSkeleton } from '../components/dashboard/DashboardSkeleton';

interface HomeScreenProps {
  onNavigateToTransactions?: () => void;
  onNavigateToInsights?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToAddExpense?: () => void;
  onNavigateToAddIncome?: () => void;
  onNavigateToSmsImport?: () => void;
  onNavigateToVoiceEntry?: () => void;
  onNavigateToSmartFeatures?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateToTransactions,
  onNavigateToInsights,
  onNavigateToProfile,
  onNavigateToAddExpense,
  onNavigateToAddIncome,
  onNavigateToSmsImport,
  onNavigateToVoiceEntry,
  onNavigateToSmartFeatures,
}) => {
  const { user, token, logout } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dashboard Data State
  const [summary, setSummary] = useState<DashboardSummary>({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
  });
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummaryItem[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<TransactionItem[]>([]);

  const fetchDashboardData = useCallback(
    async (isPullRefresh: boolean = false) => {
      if (!token) return;

      if (!isPullRefresh) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setErrorMessage(null);

      try {
        const data = await dashboardService.fetchAllDashboardData(token);
        setSummary(data.summary);
        setCategories(data.categories);
        setMonthlySummary(data.monthlySummary);
        setRecentTransactions(data.recentTransactions);
      } catch (err: any) {
        if (err.status === 401) {
          // Token expired or invalid, log out cleanly
          logout();
          return;
        }
        setErrorMessage(
          err.message || 'Unable to load dashboard data. Pull down to retry.'
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token, logout]
  );

  // Auto-refresh when HomeScreen gains focus (e.g. returning from AddTransaction)
  useFocusEffect(
    useCallback(() => {
      fetchDashboardData(true);
    }, [fetchDashboardData])
  );

  if (isLoading && !isRefreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <DashboardSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchDashboardData(true)}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Header */}
        <DashboardHeader
          userName={user?.name}
          onProfilePress={onNavigateToProfile}
        />

        {/* Error Notice with Retry */}
        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Ionicons name="cloud-offline-outline" size={20} color="#DC2626" />
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => fetchDashboardData()}
              activeOpacity={0.7}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Section B: Total Balance Card */}
        <BalanceCard
          totalIncome={summary.totalIncome}
          totalExpenses={summary.totalExpenses}
          balance={summary.balance}
        />

        {/* Section C: Quick Actions Row */}
        <QuickActions
          onAddExpense={() => onNavigateToAddExpense?.()}
          onAddIncome={() => onNavigateToAddIncome?.()}
          onScanSMS={() => onNavigateToSmsImport?.()}
          onVoiceEntry={() => onNavigateToVoiceEntry?.()}
        />

        {/* Smart Features Banner */}
        <TouchableOpacity
          style={[styles.smartBanner, theme.shadows.soft]}
          onPress={() => onNavigateToSmartFeatures?.()}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Open Smart Features and SMS Import"
        >
          <View style={styles.smartBannerLeft}>
            <View style={styles.smartIconPill}>
              <Ionicons name="sparkles" size={16} color={theme.colors.primary} />
            </View>
            <View style={styles.smartBannerTextGroup}>
              <View style={styles.smartBannerTitleRow}>
                <Text style={styles.smartBannerTitle}>Smart Tools & SMS Import</Text>
                <View style={styles.smartNewPill}>
                  <Text style={styles.smartNewPillText}>PHASE 7</Text>
                </View>
              </View>
              <Text style={styles.smartBannerSub}>Auto-detect expenses from bank alerts</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} />
        </TouchableOpacity>

        {/* Section D: Spending Overview (Chart & Comparison) */}
        <SpendingOverview monthlySummary={monthlySummary} />

        {/* Section E: Spending by Category */}
        <CategoryBreakdown
          categories={categories}
          onViewAll={onNavigateToInsights || onNavigateToTransactions}
        />

        {/* Section F: Recent Transactions */}
        <RecentTransactions
          transactions={recentTransactions}
          onViewAll={onNavigateToTransactions}
          onAddTransaction={() => onNavigateToAddExpense?.()}
        />
      </ScrollView>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: 90, // safe clearance above bottom tab bar
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    ...theme.typography.caption,
    color: '#B91C1C',
    flex: 1,
    marginLeft: theme.spacing.sm,
    fontSize: 12,
  },
  retryButton: {
    backgroundColor: '#B91C1C',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    marginLeft: theme.spacing.sm,
  },
  retryText: {
    ...theme.typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  smartBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  smartBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  smartIconPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  smartBannerTextGroup: {
    flex: 1,
  },
  smartBannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smartBannerTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
    fontSize: 14,
  },
  smartNewPill: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  smartNewPillText: {
    color: theme.colors.primary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  smartBannerSub: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
});
