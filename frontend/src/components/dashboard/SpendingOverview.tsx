import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { formatINR } from '../../utils/formatters';
import { MonthlySummaryItem } from '../../services/dashboardService';

interface SpendingOverviewProps {
  monthlySummary: MonthlySummaryItem[];
}

export const SpendingOverview: React.FC<SpendingOverviewProps> = ({
  monthlySummary = [],
}) => {
  // Determine current month and previous month
  const currentMonthData =
    monthlySummary.length > 0
      ? monthlySummary[monthlySummary.length - 1]
      : { month: '2026-10', income: 0, expenses: 0, balance: 0 };

  const prevMonthData =
    monthlySummary.length > 1
      ? monthlySummary[monthlySummary.length - 2]
      : null;

  const currentExpense = currentMonthData.expenses || 0;
  const prevExpense = prevMonthData ? prevMonthData.expenses || 0 : 0;

  // Percentage calculation
  let percentageChange: number | null = null;
  let comparisonText = 'No previous month data';
  let isIncrease = false;

  if (prevMonthData && prevExpense > 0) {
    percentageChange = ((currentExpense - prevExpense) / prevExpense) * 100;
    isIncrease = percentageChange > 0;
    comparisonText = `${Math.abs(percentageChange).toFixed(1)}% vs last month`;
  } else if (prevMonthData && prevExpense === 0 && currentExpense > 0) {
    comparisonText = 'First month with recorded expenses';
  } else if (currentExpense === 0) {
    comparisonText = 'No expenses this month';
  }

  // Format month name (e.g., "2026-10" -> "October 2026")
  let formattedMonthLabel = 'Current Month';
  try {
    if (currentMonthData.month) {
      const [year, month] = currentMonthData.month.split('-');
      const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      formattedMonthLabel = date.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });
    }
  } catch {
    formattedMonthLabel = currentMonthData.month;
  }

  // Prepare chart coordinates
  const expenseValues = monthlySummary.map((m) => m.expenses || 0);
  const maxExpense = Math.max(...expenseValues, 100);
  const chartWidth = 280;
  const chartHeight = 80;
  const paddingX = 15;
  const paddingY = 10;
  const availableWidth = chartWidth - paddingX * 2;
  const availableHeight = chartHeight - paddingY * 2;

  const points = monthlySummary.map((m, index) => {
    const x =
      monthlySummary.length > 1
        ? paddingX + (index / (monthlySummary.length - 1)) * availableWidth
        : chartWidth / 2;
    const y =
      chartHeight -
      paddingY -
      ((m.expenses || 0) / maxExpense) * availableHeight;
    return { x, y, val: m.expenses, label: m.month.slice(5) };
  });

  // Construct SVG Path
  let linePath = '';
  let fillPath = '';

  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      // Curved bezier path
      const prev = points[i - 1];
      const curr = points[i];
      const cx1 = prev.x + (curr.x - prev.x) / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + (curr.x - prev.x) / 2;
      const cy2 = curr.y;
      linePath += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${curr.x} ${curr.y}`;
    }

    fillPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;
  }

  const hasAnyExpenses = expenseValues.some((v) => v > 0);

  return (
    <View style={styles.container}>
      <View style={[styles.card, theme.shadows.soft]}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.sectionLabel}>Spending Overview</Text>
            <Text style={styles.monthLabel}>{formattedMonthLabel}</Text>
          </View>

          {/* Comparison Badge */}
          {percentageChange !== null ? (
            <View
              style={[
                styles.comparisonBadge,
                isIncrease ? styles.badgeIncrease : styles.badgeDecrease,
              ]}
            >
              <Ionicons
                name={isIncrease ? 'arrow-up' : 'arrow-down'}
                size={12}
                color={isIncrease ? '#DC2626' : '#059669'}
              />
              <Text
                style={[
                  styles.comparisonText,
                  isIncrease ? styles.textIncrease : styles.textDecrease,
                ]}
              >
                {Math.abs(percentageChange).toFixed(0)}%
              </Text>
            </View>
          ) : null}
        </View>

        {/* Total Expense Figure */}
        <View style={styles.figureRow}>
          <Text style={styles.amountText}>{formatINR(currentExpense)}</Text>
          <Text style={styles.comparisonSubtext}>{comparisonText}</Text>
        </View>

        {/* Chart View */}
        <View style={styles.chartContainer}>
          {hasAnyExpenses ? (
            <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
              <Defs>
                <LinearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={theme.colors.primary} stopOpacity="0.25" />
                  <Stop offset="1" stopColor={theme.colors.primary} stopOpacity="0.0" />
                </LinearGradient>
              </Defs>

              {/* Grid Lines */}
              <Line
                x1={0}
                y1={chartHeight - 1}
                x2={chartWidth}
                y2={chartHeight - 1}
                stroke={theme.colors.border}
                strokeWidth="1"
              />
              <Line
                x1={0}
                y1={chartHeight / 2}
                x2={chartWidth}
                y2={chartHeight / 2}
                stroke={theme.colors.border}
                strokeDasharray="4, 4"
                strokeWidth="1"
                opacity="0.6"
              />

              {/* Area gradient under curve */}
              <Path d={fillPath} fill="url(#chartFill)" />

              {/* Smooth Trend Line */}
              <Path
                d={linePath}
                fill="none"
                stroke={theme.colors.primary}
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Data Point Dots */}
              {points.map((pt, idx) => (
                <Circle
                  key={idx}
                  cx={pt.x}
                  cy={pt.y}
                  r={idx === points.length - 1 ? '4.5' : '3'}
                  fill={idx === points.length - 1 ? theme.colors.primary : theme.colors.surface}
                  stroke={theme.colors.primary}
                  strokeWidth="2"
                />
              ))}
            </Svg>
          ) : (
            <View style={styles.emptyChartBox}>
              <Ionicons
                name="bar-chart-outline"
                size={28}
                color={theme.colors.textMuted}
              />
              <Text style={styles.emptyChartText}>
                No expenses logged in the last 6 months
              </Text>
            </View>
          )}

          {/* Month Axis Labels */}
          {monthlySummary.length > 0 ? (
            <View style={styles.labelsRow}>
              {monthlySummary.map((m, idx) => (
                <Text key={idx} style={styles.axisLabel}>
                  {m.month.slice(5)}
                </Text>
              ))}
            </View>
          ) : null}
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xs,
  },
  sectionLabel: {
    ...theme.typography.subtitle,
    color: theme.colors.textPrimary,
  },
  monthLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  comparisonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
  },
  badgeIncrease: {
    backgroundColor: '#FEE2E2',
  },
  badgeDecrease: {
    backgroundColor: '#D1FAE5',
  },
  comparisonText: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 2,
  },
  textIncrease: {
    color: '#DC2626',
  },
  textDecrease: {
    color: '#059669',
  },
  figureRow: {
    marginVertical: theme.spacing.xs,
  },
  amountText: {
    ...theme.typography.title,
    fontSize: 26,
    color: theme.colors.textPrimary,
    fontWeight: '800',
  },
  comparisonSubtext: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
    fontSize: 12,
  },
  chartContainer: {
    marginTop: theme.spacing.md,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.xs,
    paddingHorizontal: 8,
  },
  axisLabel: {
    ...theme.typography.caption,
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  emptyChartBox: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  emptyChartText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    fontSize: 11,
  },
});
