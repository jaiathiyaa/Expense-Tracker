import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

interface TransactionTypeToggleProps {
  type: 'EXPENSE' | 'INCOME';
  onChangeType: (type: 'EXPENSE' | 'INCOME') => void;
  disabled?: boolean;
}

export const TransactionTypeToggle: React.FC<TransactionTypeToggleProps> = ({
  type,
  onChangeType,
  disabled = false,
}) => {
  const isExpense = type === 'EXPENSE';
  const isIncome = type === 'INCOME';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.tab,
          isExpense && styles.tabExpenseActive,
          disabled && styles.tabDisabled,
        ]}
        onPress={() => onChangeType('EXPENSE')}
        activeOpacity={0.8}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Select Expense transaction type"
        accessibilityState={{ selected: isExpense }}
      >
        <View
          style={[
            styles.iconWrapper,
            isExpense ? styles.iconExpenseActive : styles.iconInactive,
          ]}
        >
          <Ionicons
            name="arrow-up"
            size={16}
            color={isExpense ? '#FFFFFF' : theme.colors.textSecondary}
          />
        </View>
        <Text
          style={[
            styles.tabText,
            isExpense && styles.tabTextExpenseActive,
          ]}
        >
          Expense
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tab,
          isIncome && styles.tabIncomeActive,
          disabled && styles.tabDisabled,
        ]}
        onPress={() => onChangeType('INCOME')}
        activeOpacity={0.8}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Select Income transaction type"
        accessibilityState={{ selected: isIncome }}
      >
        <View
          style={[
            styles.iconWrapper,
            isIncome ? styles.iconIncomeActive : styles.iconInactive,
          ]}
        >
          <Ionicons
            name="arrow-down"
            size={16}
            color={isIncome ? '#FFFFFF' : theme.colors.textSecondary}
          />
        </View>
        <Text
          style={[
            styles.tabText,
            isIncome && styles.tabTextIncomeActive,
          ]}
        >
          Income
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#EEF2F6',
    borderRadius: theme.borderRadius.lg,
    padding: 5,
    marginVertical: theme.spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    gap: 8,
  },
  tabExpenseActive: {
    backgroundColor: '#FFFFFF',
    ...theme.shadows.soft,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  tabIncomeActive: {
    backgroundColor: '#FFFFFF',
    ...theme.shadows.soft,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  tabDisabled: {
    opacity: 0.6,
  },
  iconWrapper: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconExpenseActive: {
    backgroundColor: theme.colors.error,
  },
  iconIncomeActive: {
    backgroundColor: theme.colors.success,
  },
  iconInactive: {
    backgroundColor: 'rgba(100, 116, 139, 0.12)',
  },
  tabText: {
    ...theme.typography.subtitle,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  tabTextExpenseActive: {
    color: theme.colors.error,
    fontWeight: '700',
  },
  tabTextIncomeActive: {
    color: theme.colors.success,
    fontWeight: '700',
  },
});
