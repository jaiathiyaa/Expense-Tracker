import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { formatINR } from '../../utils/formatters';

interface TransactionSummaryCardsProps {
  totalIncome: number;
  totalExpenses: number;
  periodLabel?: string;
}

export const TransactionSummaryCards: React.FC<TransactionSummaryCardsProps> = ({
  totalIncome,
  totalExpenses,
  periodLabel = 'Loaded Records',
}) => {
  return (
    <View style={styles.container}>
      {/* Income Card */}
      <View style={[styles.card, theme.shadows.soft]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconCircle, styles.incomeIconCircle]}>
            <Ionicons name="arrow-down" size={16} color="#059669" />
          </View>
          <Text style={styles.cardLabel}>Total Income</Text>
        </View>
        <Text style={styles.incomeAmount} numberOfLines={1} adjustsFontSizeToFit>
          +{formatINR(totalIncome)}
        </Text>
        <Text style={styles.periodText}>{periodLabel}</Text>
      </View>

      {/* Expense Card */}
      <View style={[styles.card, theme.shadows.soft]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconCircle, styles.expenseIconCircle]}>
            <Ionicons name="arrow-up" size={16} color="#DC2626" />
          </View>
          <Text style={styles.cardLabel}>Total Expenses</Text>
        </View>
        <Text style={styles.expenseAmount} numberOfLines={1} adjustsFontSizeToFit>
          -{formatINR(totalExpenses)}
        </Text>
        <Text style={styles.periodText}>{periodLabel}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.md,
  },
  card: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs + 2,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.xs + 2,
  },
  incomeIconCircle: {
    backgroundColor: '#D1FAE5',
  },
  expenseIconCircle: {
    backgroundColor: '#FEE2E2',
  },
  cardLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  incomeAmount: {
    ...theme.typography.subtitle,
    color: '#059669',
    fontWeight: '700',
    fontSize: 16,
  },
  expenseAmount: {
    ...theme.typography.subtitle,
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 16,
  },
  periodText: {
    ...theme.typography.caption,
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});
