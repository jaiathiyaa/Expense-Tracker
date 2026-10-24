import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line, Text as SvgText } from 'react-native-svg';
import { theme } from '../../theme';
import { formatINR } from '../../utils/formatters';
import { InsightsTimeSeriesPoint, InsightsGranularity } from '../../services/insightsService';
import { formatChartLabel, selectAxisLabels } from '../../utils/insightsHelpers';

interface SpendingTrendChartProps {
  timeSeries: InsightsTimeSeriesPoint[];
  granularity: InsightsGranularity;
  periodLabel: string;
}

const CHART_WIDTH = 320;
const CHART_HEIGHT = 110;
const PAD_X = 8;
const PAD_Y = 14;

export const SpendingTrendChart: React.FC<SpendingTrendChartProps> = ({
  timeSeries,
  granularity,
  periodLabel,
}) => {
  const hasData = timeSeries.some((p) => p.total > 0);

  const { points, linePath, fillPath, maxVal, axisLabels } = useMemo(() => {
    const values = timeSeries.map((p) => p.total);
    const maxVal = Math.max(...values, 1);
    const availW = CHART_WIDTH - PAD_X * 2;
    const availH = CHART_HEIGHT - PAD_Y * 2;

    const pts = timeSeries.map((p, i) => {
      const x =
        timeSeries.length > 1
          ? PAD_X + (i / (timeSeries.length - 1)) * availW
          : CHART_WIDTH / 2;
      const y = CHART_HEIGHT - PAD_Y - (p.total / maxVal) * availH;
      return { x, y, val: p.total, label: p.label };
    });

    let line = '';
    let fill = '';
    if (pts.length > 0) {
      line = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 1; i < pts.length; i++) {
        const pr = pts[i - 1];
        const cu = pts[i];
        const cx1 = pr.x + (cu.x - pr.x) / 2;
        const cy1 = pr.y;
        const cx2 = pr.x + (cu.x - pr.x) / 2;
        const cy2 = cu.y;
        line += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${cu.x} ${cu.y}`;
      }
      fill = `${line} L ${pts[pts.length - 1].x} ${CHART_HEIGHT} L ${pts[0].x} ${CHART_HEIGHT} Z`;
    }

    // Select at most 6 axis labels to prevent overcrowding
    const labelItems = timeSeries.map((p) => formatChartLabel(p.label, granularity));
    const selected = selectAxisLabels(labelItems, 6);

    return { points: pts, linePath: line, fillPath: fill, maxVal, axisLabels: selected };
  }, [timeSeries, granularity]);

  // Find the peak point to annotate
  const peakIdx = useMemo(() => {
    if (!hasData) return -1;
    let idx = 0;
    let max = 0;
    timeSeries.forEach((p, i) => { if (p.total > max) { max = p.total; idx = i; } });
    return idx;
  }, [timeSeries, hasData]);

  return (
    <View style={styles.container}>
      <View style={[styles.card, theme.shadows.soft]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Spending Trend</Text>
            <Text style={styles.subtitle}>{periodLabel} · Expenses only</Text>
          </View>
          {hasData && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {granularity === 'day' ? 'Daily' : granularity === 'week' ? 'Weekly' : 'Monthly'}
              </Text>
            </View>
          )}
        </View>

        {hasData ? (
          <>
            <Svg
              width="100%"
              height={CHART_HEIGHT + 4}
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT + 4}`}
              style={styles.svg}
              accessibilityLabel="Spending trend line chart"
            >
              <Defs>
                <LinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={theme.colors.primary} stopOpacity="0.22" />
                  <Stop offset="1" stopColor={theme.colors.primary} stopOpacity="0.0" />
                </LinearGradient>
              </Defs>

              {/* Mid-grid line */}
              <Line
                x1={PAD_X} y1={CHART_HEIGHT / 2}
                x2={CHART_WIDTH - PAD_X} y2={CHART_HEIGHT / 2}
                stroke={theme.colors.border}
                strokeDasharray="4 4"
                strokeWidth="1"
                opacity="0.5"
              />
              {/* Baseline */}
              <Line
                x1={PAD_X} y1={CHART_HEIGHT - 1}
                x2={CHART_WIDTH - PAD_X} y2={CHART_HEIGHT - 1}
                stroke={theme.colors.border}
                strokeWidth="1"
              />

              {/* Area fill */}
              <Path d={fillPath} fill="url(#trendFill)" />

              {/* Line */}
              <Path
                d={linePath}
                fill="none"
                stroke={theme.colors.primary}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data dots — only if not too many points */}
              {timeSeries.length <= 32 &&
                points.map((pt, idx) => (
                  <Circle
                    key={idx}
                    cx={pt.x}
                    cy={pt.y}
                    r={idx === peakIdx ? 5 : 3}
                    fill={idx === peakIdx ? theme.colors.primary : theme.colors.surface}
                    stroke={theme.colors.primary}
                    strokeWidth="2"
                  />
                ))}

              {/* Peak annotation */}
              {peakIdx >= 0 && points[peakIdx] && (
                <SvgText
                  x={Math.min(Math.max(points[peakIdx].x, 28), CHART_WIDTH - 28)}
                  y={Math.max(points[peakIdx].y - 8, PAD_Y)}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="700"
                  fill={theme.colors.primary}
                >
                  {formatINR(timeSeries[peakIdx].total)}
                </SvgText>
              )}
            </Svg>

            {/* X-axis labels */}
            <View style={styles.axisRow}>
              {axisLabels.map((lbl, i) => (
                <Text key={i} style={[styles.axisLabel, { opacity: lbl ? 1 : 0 }]}>
                  {lbl ?? '-'}
                </Text>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📈</Text>
            <Text style={styles.emptyTitle}>No expense data</Text>
            <Text style={styles.emptySubtitle}>
              Log expenses during this period to see the trend.
            </Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.subtitle,
    color: theme.colors.textPrimary,
  },
  subtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  svg: {
    overflow: 'visible',
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: PAD_X / 2,
    marginTop: 4,
  },
  axisLabel: {
    fontSize: 9.5,
    color: theme.colors.textMuted,
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
  },
  empty: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 28,
    marginBottom: theme.spacing.xs,
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
    lineHeight: 18,
  },
});
