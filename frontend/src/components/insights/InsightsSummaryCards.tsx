import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';
import { formatINR } from '../../utils/formatters';
import { InsightsSummary } from '../../services/insightsService';

interface InsightsSummaryCardsProps {
  summary: InsightsSummary;
  periodLabel: string;
}

export const InsightsSummaryCards: React.FC<InsightsSummaryCardsProps> = ({
  summary,
  periodLabel,
}) => {
  const cards = [
    {
      id: 'total',
      label: 'Total Spending',
      value: formatINR(summary.totalSpending),
      subLabel: periodLabel,
      accent: theme.colors.primary,
      accentBg: theme.colors.primaryLight,
      icon: '💸',
    },
    {
      id: 'avg',
      label: 'Avg Daily',
      value: formatINR(summary.avgDailySpending),
      subLabel: 'per day',
      accent: '#F59E0B',
      accentBg: '#FEF3C7',
      icon: '📊',
    },
    {
      id: 'largest',
      label: 'Largest Expense',
      value: formatINR(summary.largestExpense),
      subLabel: 'single transaction',
      accent: '#EF4444',
      accentBg: '#FEE2E2',
      icon: '🔺',
    },
  ];

  return (
    <View style={styles.row} accessibilityLabel="Summary metrics">
      {cards.map((card) => (
        <View
          key={card.id}
          style={[styles.card, theme.shadows.soft]}
          accessible
          accessibilityLabel={`${card.label}: ${card.value}`}
        >
          <View style={[styles.iconBox, { backgroundColor: card.accentBg }]}>
            <Text style={styles.iconEmoji}>{card.icon}</Text>
          </View>
          <Text
            style={[styles.value, { color: card.accent }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {card.value}
          </Text>
          <Text style={styles.label}>{card.label}</Text>
          <Text style={styles.subLabel}>{card.subLabel}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  card: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
  },
  iconEmoji: {
    fontSize: 14,
  },
  value: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 1,
  },
  label: {
    fontSize: 10.5,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 1,
  },
  subLabel: {
    fontSize: 9.5,
    fontWeight: '400',
    color: theme.colors.textMuted,
  },
});
