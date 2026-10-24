import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { formatINR } from '../../utils/formatters';
import { InsightsCategoryItem } from '../../services/insightsService';
import { getCategoryDefinition } from '../../utils/categories';
import { clampPct } from '../../utils/insightsHelpers';

interface InsightsCategoryBreakdownProps {
  categories: InsightsCategoryItem[];
  totalSpending: number;
}

// ─── Donut chart ─────────────────────────────────────────────────────────────
interface DonutSlice {
  color: string;
  pct: number;
}

function buildDonutPath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const x1 = cx + r * Math.cos(rad(startAngle));
  const y1 = cy + r * Math.sin(rad(startAngle));
  const x2 = cx + r * Math.cos(rad(endAngle));
  const y2 = cy + r * Math.sin(rad(endAngle));
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

interface DonutChartProps {
  slices: DonutSlice[];
  size: number;
}

const DonutChart: React.FC<DonutChartProps> = ({ slices, size }) => {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 6;
  const strokeWidth = 13;

  // Build arc segments
  let startAngle = -90;
  const segments = slices
    .filter((s) => s.pct > 0)
    .map((s) => {
      const sweep = (s.pct / 100) * 360;
      const endAngle = startAngle + sweep;
      const seg = { ...s, startAngle, endAngle };
      startAngle = endAngle;
      return seg;
    });

  return (
    <Svg width={size} height={size} accessibilityLabel="Category donut chart">
      {/* Background track */}
      <Circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={theme.colors.surfaceSubtle}
        strokeWidth={strokeWidth}
      />
      {segments.map((seg, i) => (
        <Path
          key={i}
          d={buildDonutPath(cx, cy, r, seg.startAngle, seg.endAngle)}
          fill="none"
          stroke={seg.color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      ))}
    </Svg>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const InsightsCategoryBreakdown: React.FC<InsightsCategoryBreakdownProps> = ({
  categories,
  totalSpending,
}) => {
  const items = useMemo(() => {
    if (totalSpending <= 0) return [];
    return categories.map((c) => {
      const def = getCategoryDefinition(c.category, 'EXPENSE');
      const pct = (c.total / totalSpending) * 100;
      return { ...c, def, pct };
    });
  }, [categories, totalSpending]);

  const slices: DonutSlice[] = items.map((it) => ({
    color: it.def.color,
    pct: it.pct,
  }));

  if (totalSpending <= 0 || categories.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.card, theme.shadows.soft]}>
          <Text style={styles.title}>Spending by Category</Text>
          <View style={styles.empty}>
            <Ionicons name="pie-chart-outline" size={32} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>No expense categories</Text>
            <Text style={styles.emptySubtitle}>
              Add categorised expenses to see the breakdown.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.card, theme.shadows.soft]}>
        <Text style={styles.title}>Spending by Category</Text>

        {/* Donut + legend side by side */}
        <View style={styles.body}>
          {/* Donut chart */}
          <View style={styles.donutWrapper}>
            <DonutChart slices={slices} size={110} />
            {/* Center label */}
            <View style={styles.donutCenter} pointerEvents="none">
              <Text style={styles.donutTotal} numberOfLines={1} adjustsFontSizeToFit>
                {formatINR(totalSpending)}
              </Text>
              <Text style={styles.donutLabel}>Total</Text>
            </View>
          </View>

          {/* Category list */}
          <View style={styles.legend}>
            {items.slice(0, 6).map((it, idx) => (
              <View key={idx} style={styles.legendRow}>
                <View style={styles.legendLeft}>
                  <View style={[styles.legendDot, { backgroundColor: it.def.color }]} />
                  <Text style={styles.legendName} numberOfLines={1}>
                    {it.category}
                  </Text>
                </View>
                <Text style={styles.legendPct}>{it.pct.toFixed(0)}%</Text>
              </View>
            ))}
            {items.length > 6 && (
              <Text style={styles.moreText}>+{items.length - 6} more categories</Text>
            )}
          </View>
        </View>

        {/* Full bar list */}
        <View style={styles.barList}>
          {items.map((it, idx) => (
            <View key={idx} style={styles.barItem}>
              <View style={styles.barTopRow}>
                <View style={styles.barLeft}>
                  <View style={[styles.iconBox, { backgroundColor: it.def.bgColor }]}>
                    <Ionicons name={it.def.icon} size={14} color={it.def.color} />
                  </View>
                  <Text style={styles.barName} numberOfLines={1}>{it.category}</Text>
                </View>
                <View style={styles.barRight}>
                  <Text style={styles.barAmount}>{formatINR(it.total)}</Text>
                  <Text style={styles.barPct}>{it.pct.toFixed(1)}%</Text>
                </View>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${clampPct(it.pct)}%`,
                      backgroundColor: it.def.color,
                    },
                  ]}
                />
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
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  donutWrapper: {
    width: 110,
    height: 110,
    position: 'relative',
    marginRight: theme.spacing.lg,
    flexShrink: 0,
  },
  donutCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  donutTotal: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  donutLabel: {
    fontSize: 9,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  legend: {
    flex: 1,
    gap: 6,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
    flexShrink: 0,
  },
  legendName: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    flex: 1,
  },
  legendPct: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  moreText: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  barList: {
    gap: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
  },
  barItem: {},
  barTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  barLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: theme.spacing.sm,
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
  barName: {
    fontSize: 12.5,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    flex: 1,
  },
  barRight: {
    alignItems: 'flex-end',
  },
  barAmount: {
    fontSize: 12.5,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  barPct: {
    fontSize: 10,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  track: {
    height: 5,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
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
