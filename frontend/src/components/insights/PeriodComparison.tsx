import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { theme } from '../../theme';
import { formatINR } from '../../utils/formatters';
import { InsightsCategoryItem } from '../../services/insightsService';
import { getCategoryDefinition } from '../../utils/categories';
import { percentageChange } from '../../utils/insightsHelpers';

interface PeriodComparisonProps {
  categories: InsightsCategoryItem[];
  prevCategories: InsightsCategoryItem[];
  totalSpending: number;
  prevTotalSpending: number;
  periodLabel: string;
}

export const PeriodComparison: React.FC<PeriodComparisonProps> = ({
  categories,
  prevCategories,
  totalSpending,
  prevTotalSpending,
  periodLabel,
}) => {
  // Build a unified view merging current + previous category data
  const rows = useMemo(() => {
    const allKeys = new Set<string>([
      ...categories.map((c) => c.category),
      ...prevCategories.map((c) => c.category),
    ]);

    const currMap = new Map(categories.map((c) => [c.category, c.total]));
    const prevMap = new Map(prevCategories.map((c) => [c.category, c.total]));

    return Array.from(allKeys)
      .map((key) => {
        const curr = currMap.get(key) ?? 0;
        const prev = prevMap.get(key) ?? 0;
        const def = getCategoryDefinition(key, 'EXPENSE');
        const change = percentageChange(curr, prev);
        return { category: key, curr, prev, change, def };
      })
      .filter((r) => r.curr > 0 || r.prev > 0)
      .sort((a, b) => b.curr - a.curr)
      .slice(0, 8);
  }, [categories, prevCategories]);

  // Overall comparison
  const overallChange = percentageChange(totalSpending, prevTotalSpending);

  const isNoData = totalSpending === 0 && prevTotalSpending === 0;

  if (isNoData) {
    return (
      <View style={styles.container}>
        <View style={[styles.card, theme.shadows.soft]}>
          <Text style={styles.title}>vs Previous Period</Text>
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No comparison data</Text>
            <Text style={styles.emptySubtitle}>
              No expenses in this or the previous period.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // Build grouped bar chart data (top 5 categories)
  const topRows = rows.slice(0, 5);
  const maxBarVal = Math.max(
    ...topRows.flatMap((r) => [r.curr, r.prev]),
    1
  );

  const BAR_W = 300;
  const BAR_H = 100;
  const groupW = BAR_W / Math.max(topRows.length, 1);
  const barW = Math.max((groupW - 14) / 2, 4);

  return (
    <View style={styles.container}>
      <View style={[styles.card, theme.shadows.soft]}>
        <Text style={styles.title}>vs Previous Period</Text>

        {/* Overall comparison header */}
        <View style={styles.overallRow}>
          <View style={styles.overallBlock}>
            <Text style={styles.overallLabel}>Current</Text>
            <Text style={styles.overallAmount}>{formatINR(totalSpending)}</Text>
          </View>
          <View style={styles.overallArrow}>
            {overallChange !== null ? (
              <>
                <Text
                  style={[
                    styles.arrowText,
                    { color: overallChange.value > 0 ? theme.colors.error : theme.colors.success },
                  ]}
                >
                  {overallChange.isNew
                    ? 'New spending'
                    : overallChange.value > 0
                    ? `▲ ${Math.abs(overallChange.value).toFixed(1)}%`
                    : `▼ ${Math.abs(overallChange.value).toFixed(1)}%`}
                </Text>
                <Text style={styles.arrowSubLabel}>
                  {overallChange.isNew
                    ? 'No previous data'
                    : overallChange.value > 0
                    ? 'spending increased'
                    : 'spending decreased'}
                </Text>
              </>
            ) : (
              <Text style={styles.arrowSubLabel}>No change</Text>
            )}
          </View>
          <View style={[styles.overallBlock, { alignItems: 'flex-end' }]}>
            <Text style={styles.overallLabel}>Previous</Text>
            <Text style={styles.overallAmount}>
              {prevTotalSpending > 0 ? formatINR(prevTotalSpending) : '—'}
            </Text>
          </View>
        </View>

        {/* Grouped bar chart */}
        {topRows.length > 0 && (
          <View style={styles.chartWrapper}>
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.colors.primary }]} />
                <Text style={styles.legendText}>Current</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#CBD5E1' }]} />
                <Text style={styles.legendText}>Previous</Text>
              </View>
            </View>
            <Svg
              width="100%"
              height={BAR_H + 24}
              viewBox={`0 0 ${BAR_W} ${BAR_H + 24}`}
              accessibilityLabel="Grouped bar chart comparing current vs previous period spending"
            >
              {topRows.map((row, gi) => {
                const gx = gi * groupW + 6;
                const currH = Math.max((row.curr / maxBarVal) * (BAR_H - 10), row.curr > 0 ? 3 : 0);
                const prevH = Math.max((row.prev / maxBarVal) * (BAR_H - 10), row.prev > 0 ? 3 : 0);
                const shortName = row.category.split(' ')[0].slice(0, 6);

                return (
                  <React.Fragment key={gi}>
                    {/* Previous bar */}
                    <Rect
                      x={gx}
                      y={BAR_H - 10 - prevH}
                      width={barW}
                      height={prevH}
                      fill="#CBD5E1"
                      rx={2}
                    />
                    {/* Current bar */}
                    <Rect
                      x={gx + barW + 3}
                      y={BAR_H - 10 - currH}
                      width={barW}
                      height={currH}
                      fill={row.def.color}
                      rx={2}
                    />
                    {/* Label */}
                    <SvgText
                      x={gx + groupW / 2 - 6}
                      y={BAR_H + 12}
                      textAnchor="middle"
                      fontSize="7.5"
                      fill={theme.colors.textSecondary}
                    >
                      {shortName}
                    </SvgText>
                  </React.Fragment>
                );
              })}
            </Svg>
          </View>
        )}

        {/* Category comparison rows */}
        <View style={styles.rowList}>
          {rows.map((row, idx) => (
            <View key={idx} style={styles.compRow}>
              <View style={[styles.compIconBox, { backgroundColor: row.def.bgColor }]}>
                {/* Icon via emoji fallback for small size */}
                <View style={[styles.dot, { backgroundColor: row.def.color }]} />
              </View>
              <View style={styles.compInfo}>
                <Text style={styles.compName} numberOfLines={1}>{row.category}</Text>
                <Text style={styles.compSub}>
                  Prev: {row.prev > 0 ? formatINR(row.prev) : '—'}
                </Text>
              </View>
              <View style={styles.compRight}>
                <Text style={styles.compCurr}>{row.curr > 0 ? formatINR(row.curr) : '—'}</Text>
                {row.change !== null ? (
                  <Text
                    style={[
                      styles.compChange,
                      {
                        color: row.change.isNew
                          ? theme.colors.textSecondary
                          : row.change.value > 0
                          ? theme.colors.error
                          : theme.colors.success,
                      },
                    ]}
                  >
                    {row.change.isNew
                      ? 'New'
                      : row.change.value > 0
                      ? `▲${Math.abs(row.change.value).toFixed(0)}%`
                      : `▼${Math.abs(row.change.value).toFixed(0)}%`}
                  </Text>
                ) : (
                  <Text style={[styles.compChange, { color: theme.colors.textMuted }]}>—</Text>
                )}
              </View>
            </View>
          ))}
        </View>
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
  title: {
    ...theme.typography.subtitle,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  overallRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  overallBlock: {
    flex: 1,
  },
  overallLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  overallAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  overallArrow: {
    flex: 1,
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  arrowSubLabel: {
    fontSize: 9.5,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  chartWrapper: {
    marginBottom: theme.spacing.md,
  },
  chartLegend: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  rowList: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  compRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
    flexShrink: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  compInfo: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  compName: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  compSub: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  compRight: {
    alignItems: 'flex-end',
    minWidth: 70,
  },
  compCurr: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  compChange: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  empty: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
