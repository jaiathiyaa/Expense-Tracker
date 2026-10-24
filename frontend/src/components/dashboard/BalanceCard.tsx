import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { formatINR } from '../../utils/formatters';

interface BalanceCardProps {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  totalIncome,
  totalExpenses,
  balance,
}) => {
  return (
    <View style={styles.cardWrapper}>
      {/* Background SVG Canvas with Gradient & Subtle Decorative Geometry */}
      <View style={styles.svgBackground}>
        <Svg height="100%" width="100%" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="balanceGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#5145F5" stopOpacity="1" />
              <Stop offset="1" stopColor="#372AC7" stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" rx={20} fill="url(#balanceGrad)" />
          {/* Subtle geometric circles */}
          <Circle cx="85%" cy="20%" r="90" fill="#FFFFFF" opacity="0.06" />
          <Circle cx="95%" cy="75%" r="60" fill="#FFFFFF" opacity="0.04" />
          <Circle cx="10%" cy="95%" r="50" fill="#FFFFFF" opacity="0.05" />
        </Svg>
      </View>

      {/* Card Content */}
      <View style={styles.cardContent}>
        {/* Balance Header */}
        <View style={styles.headerRow}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <View style={styles.currencyBadge}>
            <Text style={styles.currencyText}>INR (₹)</Text>
          </View>
        </View>

        {/* Balance Amount */}
        <Text style={styles.balanceValue} numberOfLines={1} adjustsFontSizeToFit>
          {formatINR(balance)}
        </Text>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Income & Expense Summary Row */}
        <View style={styles.summaryRow}>
          {/* Income Column */}
          <View style={styles.metricColumn}>
            <View style={styles.metricIconCircleGreen}>
              <Ionicons name="arrow-down" size={14} color="#10B981" />
            </View>
            <View>
              <Text style={styles.metricLabel}>Income</Text>
              <Text style={styles.metricValueIncome}>
                {formatINR(totalIncome)}
              </Text>
            </View>
          </View>

          {/* Vertical Separator */}
          <View style={styles.verticalSeparator} />

          {/* Expenses Column */}
          <View style={styles.metricColumn}>
            <View style={styles.metricIconCircleRed}>
              <Ionicons name="arrow-up" size={14} color="#F87171" />
            </View>
            <View>
              <Text style={styles.metricLabel}>Expenses</Text>
              <Text style={styles.metricValueExpense}>
                {formatINR(totalExpenses)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    marginHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    minHeight: 180,
    ...theme.shadows.medium,
    marginBottom: theme.spacing.xl,
  },
  svgBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardContent: {
    padding: theme.spacing.xl,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  balanceLabel: {
    ...theme.typography.caption,
    color: '#E0E7FF',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  currencyBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  currencyText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  balanceValue: {
    ...theme.typography.hero,
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginVertical: theme.spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginVertical: theme.spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricColumn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricIconCircleGreen: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  metricIconCircleRed: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  metricLabel: {
    ...theme.typography.caption,
    color: '#C7D2FE',
    fontSize: 11,
  },
  metricValueIncome: {
    ...theme.typography.bodyBold,
    color: '#A7F3D0',
    fontSize: 14,
  },
  metricValueExpense: {
    ...theme.typography.bodyBold,
    color: '#FECACA',
    fontSize: 14,
  },
  verticalSeparator: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: theme.spacing.sm,
  },
});
