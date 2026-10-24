import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

export const FinanceIllustration: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Background Glow */}
      <View style={styles.glowCircle} />

      {/* Main Illustration Card Canvas */}
      <View style={styles.cardContainer}>
        {/* Main Bank Card */}
        <View style={styles.mainCard}>
          <Svg height="140" width="220" viewBox="0 0 220 140">
            <Defs>
              <LinearGradient id="cardGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#6366F1" stopOpacity="1" />
                <Stop offset="1" stopColor="#4338CA" stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Rect width="220" height="140" rx="16" fill="url(#cardGrad)" />
            {/* Chip */}
            <Rect x="20" y="24" width="30" height="22" rx="4" fill="#FCD34D" opacity="0.9" />
            <Rect x="25" y="30" width="20" height="10" rx="2" fill="#D97706" opacity="0.4" />
            {/* Contactless waves */}
            <Path
              d="M 60 30 Q 64 35 60 40 M 65 27 Q 71 35 65 43"
              stroke="#FFFFFF"
              strokeWidth="2"
              fill="none"
              opacity="0.8"
            />
            {/* Card text */}
            <Circle cx="185" cy="35" r="12" fill="#FFFFFF" opacity="0.25" />
            <Circle cx="172" cy="35" r="12" fill="#FFFFFF" opacity="0.35" />
          </Svg>

          <View style={styles.cardOverlay}>
            <View>
              <Text style={styles.cardBalanceLabel}>Total Balance</Text>
              <Text style={styles.cardBalanceValue}>$14,850.00</Text>
            </View>
            <View style={styles.cardBottomRow}>
              <Text style={styles.cardNumber}>•••• 8842</Text>
              <Text style={styles.cardExpiry}>09/28</Text>
            </View>
          </View>
        </View>

        {/* Floating Income Badge */}
        <View style={[styles.floatingBadge, styles.incomeBadge, theme.shadows.medium]}>
          <View style={styles.badgeIconCircleGreen}>
            <Ionicons name="arrow-down" size={14} color="#059669" />
          </View>
          <View>
            <Text style={styles.badgeLabel}>Income</Text>
            <Text style={styles.badgeAmountGreen}>+$4,250.00</Text>
          </View>
        </View>

        {/* Floating Expense Badge */}
        <View style={[styles.floatingBadge, styles.expenseBadge, theme.shadows.medium]}>
          <View style={styles.badgeIconCirclePurple}>
            <Ionicons name="arrow-up" size={14} color={theme.colors.primary} />
          </View>
          <View>
            <Text style={styles.badgeLabel}>Expense</Text>
            <Text style={styles.badgeAmountPurple}>-$850.50</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: theme.spacing.lg,
    height: 200,
  },
  glowCircle: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#EEF0FF',
    opacity: 0.8,
  },
  cardContainer: {
    position: 'relative',
    width: 280,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainCard: {
    borderRadius: 16,
    overflow: 'hidden',
    ...theme.shadows.medium,
  },
  cardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: theme.spacing.lg,
    justifyContent: 'space-between',
  },
  cardBalanceLabel: {
    ...theme.typography.caption,
    color: '#E0E7FF',
    fontSize: 11,
    marginTop: 34,
  },
  cardBalanceValue: {
    ...theme.typography.title,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardNumber: {
    ...theme.typography.caption,
    color: '#E0E7FF',
    letterSpacing: 1,
  },
  cardExpiry: {
    ...theme.typography.caption,
    color: '#E0E7FF',
  },
  floatingBadge: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  incomeBadge: {
    top: -5,
    right: 0,
  },
  expenseBadge: {
    bottom: 0,
    left: 0,
  },
  badgeIconCircleGreen: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  badgeIconCirclePurple: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  badgeLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  badgeAmountGreen: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  badgeAmountPurple: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
