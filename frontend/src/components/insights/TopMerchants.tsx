import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { formatINR } from '../../utils/formatters';
import { InsightsMerchant } from '../../services/insightsService';
import { getCategoryDefinition } from '../../utils/categories';

interface TopMerchantsProps {
  merchants: InsightsMerchant[];
}

const RANK_COLORS = ['#F59E0B', '#94A3B8', '#CD7F32'];

export const TopMerchants: React.FC<TopMerchantsProps> = ({ merchants }) => {
  if (merchants.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.card, theme.shadows.soft]}>
          <Text style={styles.title}>Top Merchants</Text>
          <View style={styles.empty}>
            <Ionicons name="storefront-outline" size={32} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>No expense transactions</Text>
            <Text style={styles.emptySubtitle}>
              Log expenses to see your top spending destinations.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.card, theme.shadows.soft]}>
        <View style={styles.header}>
          <Text style={styles.title}>Top Merchants</Text>
          <Text style={styles.note}>by transaction title</Text>
        </View>

        {merchants.map((m, idx) => {
          const def = getCategoryDefinition(m.category, 'EXPENSE');
          const rankColor = RANK_COLORS[idx] ?? theme.colors.textMuted;
          const isTop3 = idx < 3;

          return (
            <View
              key={idx}
              style={[styles.row, idx < merchants.length - 1 && styles.rowBorder]}
              accessible
              accessibilityLabel={`Rank ${idx + 1}: ${m.title}, ${m.count} transactions, ${formatINR(m.total)}`}
            >
              {/* Rank */}
              <View style={[styles.rankBox, isTop3 && { backgroundColor: `${rankColor}22` }]}>
                <Text style={[styles.rank, { color: isTop3 ? rankColor : theme.colors.textMuted }]}>
                  {idx + 1}
                </Text>
              </View>

              {/* Category icon */}
              <View style={[styles.iconBox, { backgroundColor: def.bgColor }]}>
                <Ionicons name={def.icon} size={14} color={def.color} />
              </View>

              {/* Details */}
              <View style={styles.info}>
                <Text style={styles.merchantName} numberOfLines={1}>
                  {m.title}
                </Text>
                <Text style={styles.merchantCount}>
                  {m.count} {m.count === 1 ? 'transaction' : 'transactions'}
                  {m.category ? ` · ${m.category}` : ''}
                </Text>
              </View>

              {/* Amount */}
              <Text style={styles.amount}>{formatINR(m.total)}</Text>
            </View>
          );
        })}

        <Text style={styles.disclaimer}>
          * Merchant identified by transaction title. No dedicated merchant field exists.
        </Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.subtitle,
    color: theme.colors.textPrimary,
  },
  note: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm + 2,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rankBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
    flexShrink: 0,
  },
  rank: {
    fontSize: 12,
    fontWeight: '800',
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
    flexShrink: 0,
  },
  info: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  merchantName: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  merchantCount: {
    fontSize: 10.5,
    fontWeight: '400',
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  amount: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'right',
  },
  disclaimer: {
    fontSize: 9.5,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: theme.spacing.md,
    lineHeight: 13,
  },
  empty: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
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
    lineHeight: 18,
  },
});
