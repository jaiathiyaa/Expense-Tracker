import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';
import {
  transactionService,
  GetTransactionsParams,
} from '../services/transactionService';
import { TransactionItem } from '../services/dashboardService';
import { formatINR, formatTransactionDate } from '../utils/formatters';
import { groupTransactionsByDate } from '../utils/dateGrouping';
import { TransactionSummaryCards } from '../components/transactions/TransactionSummaryCards';
import {
  TransactionFilterChips,
  FilterType,
} from '../components/transactions/TransactionFilterChips';
import {
  TransactionFilterModal,
  FilterOptions,
} from '../components/transactions/TransactionFilterModal';
import { TransactionDetailModal } from '../components/transactions/TransactionDetailModal';
import { useFocusEffect } from '@react-navigation/native';

interface TransactionsScreenProps {
  onNavigateToAdd?: () => void;
}

export const TransactionsScreen: React.FC<TransactionsScreenProps> = ({
  onNavigateToAdd,
}) => {
  const { token } = useAuth();

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Filter State
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<FilterType>('ALL');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    dateRangePreset: 'ALL',
    order: 'desc',
  });

  // Data & Pagination State
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected Transaction for Detail Modal
  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Fetch Transactions from Backend
  const fetchTransactions = useCallback(
    async (
      pageNum: number = 1,
      isRefresh: boolean = false,
      isLoadMore: boolean = false
    ) => {
      if (!token) return;

      if (isRefresh) {
        setIsRefreshing(true);
      } else if (isLoadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const params: GetTransactionsParams = {
          page: pageNum,
          limit: 15,
          sortBy: 'date',
          order: filterOptions.order,
        };

        if (selectedTypeFilter === 'INCOME') {
          params.type = 'INCOME';
        } else if (selectedTypeFilter === 'EXPENSE') {
          params.type = 'EXPENSE';
        }

        if (filterOptions.startDate && filterOptions.endDate) {
          params.startDate = filterOptions.startDate;
          params.endDate = filterOptions.endDate;
        }

        const response = await transactionService.getTransactions(token, params);

        if (pageNum === 1) {
          setTransactions(response.data || []);
        } else {
          setTransactions((prev) => [...prev, ...(response.data || [])]);
        }

        setPage(response.pagination.page);
        setHasNextPage(response.pagination.hasNextPage);
      } catch (err: any) {
        setError(err.message || 'Unable to load transactions.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [token, selectedTypeFilter, filterOptions]
  );

  // Refresh transactions when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchTransactions(1, true);
    }, [fetchTransactions])
  );

  // Client-side search filtering
  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) {
      return transactions;
    }
    const query = searchQuery.trim().toLowerCase();
    return transactions.filter((tx) => {
      const matchTitle = (tx.title || '').toLowerCase().includes(query);
      const matchCategory = (tx.category || '').toLowerCase().includes(query);
      return matchTitle || matchCategory;
    });
  }, [transactions, searchQuery]);

  // Group filtered transactions by Date
  const groupedData = useMemo(() => {
    return groupTransactionsByDate(filteredTransactions);
  }, [filteredTransactions]);

  // Derived Totals for the active filtered set
  const { totalIncome, totalExpenses } = useMemo(() => {
    let income = 0;
    let expenses = 0;
    filteredTransactions.forEach((tx) => {
      if (tx.type === 'INCOME') {
        income += tx.amount || 0;
      } else {
        expenses += tx.amount || 0;
      }
    });
    return { totalIncome: income, totalExpenses: expenses };
  }, [filteredTransactions]);

  const handleEndReached = () => {
    if (!isLoadingMore && hasNextPage && !searchQuery.trim()) {
      fetchTransactions(page + 1, false, true);
    }
  };

  const handleTypeFilterSelect = (filter: FilterType) => {
    setSelectedTypeFilter(filter);
    setPage(1);
  };

  const handleTransactionPress = (tx: TransactionItem) => {
    setSelectedTx(tx);
    setDetailModalVisible(true);
  };

  const getCategoryIcon = (category: string | null | undefined, type: string) => {
    const norm = (category || '').toLowerCase();
    if (type === 'INCOME') {
      return { name: 'arrow-down' as const, color: '#059669', bg: '#D1FAE5' };
    }
    if (norm.includes('food') || norm.includes('grocer')) {
      return { name: 'restaurant-outline' as const, color: '#F59E0B', bg: '#FEF3C7' };
    }
    if (norm.includes('house') || norm.includes('rent')) {
      return { name: 'home-outline' as const, color: '#3B82F6', bg: '#DBEAFE' };
    }
    if (norm.includes('bill') || norm.includes('util')) {
      return { name: 'flash-outline' as const, color: '#EF4444', bg: '#FEE2E2' };
    }
    if (norm.includes('travel') || norm.includes('flight')) {
      return { name: 'airplane-outline' as const, color: '#8B5CF6', bg: '#EDE9FE' };
    }
    if (norm.includes('shop')) {
      return { name: 'bag-handle-outline' as const, color: '#10B981', bg: '#D1FAE5' };
    }
    return {
      name: 'card-outline' as const,
      color: theme.colors.primary,
      bg: theme.colors.primaryLight,
    };
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header Row */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transactions</Text>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filterOptions.dateRangePreset !== 'ALL' && styles.filterButtonActive,
          ]}
          onPress={() => setFilterModalVisible(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Open filters"
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={
              filterOptions.dateRangePreset !== 'ALL'
                ? theme.colors.primary
                : theme.colors.textPrimary
            }
          />
        </TouchableOpacity>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons
            name="search-outline"
            size={18}
            color={theme.colors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by title or category..."
            placeholderTextColor={theme.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={theme.colors.textMuted}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Summary Cards */}
      <TransactionSummaryCards
        totalIncome={totalIncome}
        totalExpenses={totalExpenses}
        periodLabel={
          filterOptions.dateRangePreset === 'THIS_MONTH'
            ? 'This Month'
            : filterOptions.dateRangePreset === 'LAST_30_DAYS'
            ? 'Last 30 Days'
            : 'Active Filter Set'
        }
      />

      {/* Filter Chips (All, Income, Expense) */}
      <TransactionFilterChips
        selectedFilter={selectedTypeFilter}
        onSelectFilter={handleTypeFilterSelect}
      />

      {/* Error Banner with Retry */}
      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => fetchTransactions(1)}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Main List */}
      {isLoading && !isRefreshing && transactions.length === 0 ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      ) : (
        <FlatList
          data={groupedData}
          keyExtractor={(item) => item.dateKey}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchTransactions(1, true)}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            ) : undefined
          }
          ListEmptyComponent={
            searchQuery.trim().length > 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="search-outline"
                  size={42}
                  color={theme.colors.textMuted}
                />
                <Text style={styles.emptyTitle}>No matching transactions</Text>
                <Text style={styles.emptySubtitle}>
                  No records match "{searchQuery}". Try a different keyword.
                </Text>
                <TouchableOpacity
                  style={styles.clearSearchBtn}
                  onPress={() => setSearchQuery('')}
                >
                  <Text style={styles.clearSearchText}>Clear Search</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="receipt-outline"
                  size={42}
                  color={theme.colors.textMuted}
                />
                <Text style={styles.emptyTitle}>No transactions found</Text>
                <Text style={styles.emptySubtitle}>
                  {selectedTypeFilter !== 'ALL'
                    ? `No ${selectedTypeFilter.toLowerCase()} records match your filter criteria.`
                    : 'You have not recorded any transactions yet.'}
                </Text>
                <TouchableOpacity
                  style={styles.addTransactionBtn}
                  onPress={() => onNavigateToAdd?.()}
                >
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                  <Text style={styles.addTransactionText}>Add Transaction</Text>
                </TouchableOpacity>
              </View>
            )
          }
          renderItem={({ item: group }) => (
            <View style={styles.groupContainer}>
              {/* Date Section Header */}
              <View style={styles.dateHeader}>
                <Text style={styles.dateHeaderText}>{group.title}</Text>
                <Text style={styles.dateHeaderCount}>
                  {group.data.length} {group.data.length === 1 ? 'item' : 'items'}
                </Text>
              </View>

              {/* Transactions in Group */}
              <View style={[styles.groupCard, theme.shadows.soft]}>
                {group.data.map((tx, idx) => {
                  const isIncome = tx.type === 'INCOME';
                  const iconMeta = getCategoryIcon(tx.category, tx.type);
                  const isLast = idx === group.data.length - 1;

                  return (
                    <TouchableOpacity
                      key={tx.id}
                      style={[styles.txRow, !isLast && styles.rowBorder]}
                      onPress={() => handleTransactionPress(tx)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.rowLeft}>
                        <View
                          style={[
                            styles.iconBox,
                            { backgroundColor: iconMeta.bg },
                          ]}
                        >
                          <Ionicons
                            name={iconMeta.name}
                            size={18}
                            color={iconMeta.color}
                          />
                        </View>
                        <View style={styles.txDetails}>
                          <Text style={styles.txTitle} numberOfLines={1}>
                            {tx.title}
                          </Text>
                          <Text style={styles.txCategory}>
                            {tx.category ? `${tx.category} • ` : ''}
                            {formatTransactionDate(tx.date)}
                          </Text>
                        </View>
                      </View>

                      {/* Signed Amount */}
                      <Text
                        style={[
                          styles.txAmount,
                          isIncome ? styles.amountIncome : styles.amountExpense,
                        ]}
                      >
                        {isIncome ? '+' : '−'} {formatINR(tx.amount)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        />
      )}

      {/* Filter Modal */}
      <TransactionFilterModal
        visible={filterModalVisible}
        currentFilters={filterOptions}
        onClose={() => setFilterModalVisible(false)}
        onApply={(newFilters) => {
          setFilterOptions(newFilters);
          setPage(1);
        }}
        onReset={() => {
          setFilterOptions({ dateRangePreset: 'ALL', order: 'desc' });
          setPage(1);
        }}
      />

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        visible={detailModalVisible}
        transaction={selectedTx}
        token={token}
        onClose={() => {
          setDetailModalVisible(false);
          setSelectedTx(null);
        }}
        onDeleted={() => {
          fetchTransactions(1);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  headerTitle: {
    ...theme.typography.title,
    color: theme.colors.textPrimary,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.soft,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  searchContainer: {
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    minHeight: 46,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    paddingVertical: theme.spacing.sm,
  },
  errorBox: {
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
  },
  retryBtn: {
    backgroundColor: '#B91C1C',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  retryText: {
    ...theme.typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  loadingText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  listContent: {
    paddingBottom: 100, // Clearance for bottom navigation bar
  },
  groupContainer: {
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs + 2,
    paddingHorizontal: 4,
  },
  dateHeaderText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 11,
  },
  dateHeaderCount: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontSize: 10,
  },
  groupCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceSubtle,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: theme.spacing.md,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  txDetails: {
    flex: 1,
  },
  txTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
    fontSize: 14,
  },
  txCategory: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  txAmount: {
    ...theme.typography.bodyBold,
    fontSize: 14,
  },
  amountIncome: {
    color: '#059669',
  },
  amountExpense: {
    color: '#DC2626',
  },
  footerLoader: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    lineHeight: 18,
  },
  clearSearchBtn: {
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.full,
  },
  clearSearchText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  addTransactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm + 2,
    borderRadius: theme.borderRadius.full,
    marginTop: theme.spacing.lg,
  },
  addTransactionText: {
    ...theme.typography.button,
    color: '#FFFFFF',
    fontSize: 13,
    marginLeft: 4,
  },
});
