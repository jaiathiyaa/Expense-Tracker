import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { formatINR, formatTransactionDate } from '../../utils/formatters';
import { TransactionItem } from '../../services/dashboardService';
import { SyncStatusBadge } from '../transactions/SyncStatusBadge';

interface RecentTransactionsProps {
  transactions: TransactionItem[];
  onViewAll?: () => void;
  onAddTransaction?: () => void;
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({
  transactions = [],
  onViewAll,
  onAddTransaction,
}) => {
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
    return { name: 'card-outline' as const, color: theme.colors.primary, bg: theme.colors.primaryLight };
  };

  return (
    <View style={styles.container}>
      <View style={[styles.card, theme.shadows.soft]}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Recent Transactions</Text>
          {transactions.length > 0 && onViewAll ? (
            <TouchableOpacity
              onPress={onViewAll}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Transaction Rows */}
        {transactions.length > 0 ? (
          <View style={styles.listContainer}>
            {transactions.slice(0, 4).map((tx, idx) => {
              const isIncome = tx.type === 'INCOME';
              const iconMeta = getCategoryIcon(tx.category, tx.type);
              const isLast = idx === Math.min(transactions.length, 4) - 1;

              return (
                <View
                  key={tx.id || idx}
                  style={[styles.transactionRow, !isLast && styles.rowBorder]}
                >
                  <View style={styles.leftCol}>
                    <View style={[styles.iconBox, { backgroundColor: iconMeta.bg }]}>
                      <Ionicons name={iconMeta.name} size={18} color={iconMeta.color} />
                    </View>
                    <View style={styles.detailsCol}>
                      <Text style={styles.txTitle} numberOfLines={1}>
                        {tx.title}
                      </Text>
                      <Text style={styles.txSubtitle}>
                        {tx.category ? `${tx.category} • ` : ''}
                        {formatTransactionDate(tx.date)}
                      </Text>
                      <SyncStatusBadge status={tx.syncStatus} />
                    </View>
                  </View>

                  {/* Signed Amount */}
                  <Text
                    style={[
                      styles.amountText,
                      isIncome ? styles.amountIncome : styles.amountExpense,
                    ]}
                  >
                    {isIncome ? '+' : '-'} {formatINR(tx.amount)}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="receipt-outline"
              size={36}
              color={theme.colors.textMuted}
            />
            <Text style={styles.emptyTitle}>No transactions recorded</Text>
            <Text style={styles.emptySubtitle}>
              Start tracking your cash flow by logging your first transaction.
            </Text>
            {onAddTransaction ? (
              <TouchableOpacity
                style={styles.emptyAddButton}
                onPress={onAddTransaction}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={16} color={theme.colors.textLight} />
                <Text style={styles.emptyAddText}>Add Transaction</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.subtitle,
    color: theme.colors.textPrimary,
  },
  viewAllText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  listContainer: {
    marginTop: theme.spacing.xs,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceSubtle,
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: theme.spacing.md,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  detailsCol: {
    flex: 1,
  },
  txTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
    fontSize: 14,
  },
  txSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  amountText: {
    ...theme.typography.bodyBold,
    fontSize: 14,
  },
  amountIncome: {
    color: '#059669',
  },
  amountExpense: {
    color: '#DC2626',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.sm,
  },
  emptySubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    marginTop: theme.spacing.md,
  },
  emptyAddText: {
    ...theme.typography.caption,
    color: theme.colors.textLight,
    fontWeight: '700',
    marginLeft: 4,
  },
});
