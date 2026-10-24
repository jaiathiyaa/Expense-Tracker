import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../../theme';

export type FilterType = 'ALL' | 'INCOME' | 'EXPENSE';

interface TransactionFilterChipsProps {
  selectedFilter: FilterType;
  onSelectFilter: (filter: FilterType) => void;
  counts?: { all: number; income: number; expense: number };
}

export const TransactionFilterChips: React.FC<TransactionFilterChipsProps> = ({
  selectedFilter,
  onSelectFilter,
  counts,
}) => {
  const chips: { key: FilterType; label: string; count?: number }[] = [
    { key: 'ALL', label: 'All', count: counts?.all },
    { key: 'INCOME', label: 'Income', count: counts?.income },
    { key: 'EXPENSE', label: 'Expense', count: counts?.expense },
  ];

  return (
    <View style={styles.container}>
      {chips.map((chip) => {
        const isActive = selectedFilter === chip.key;
        return (
          <TouchableOpacity
            key={chip.key}
            style={[
              styles.chip,
              isActive ? styles.chipActive : styles.chipInactive,
            ]}
            onPress={() => onSelectFilter(chip.key)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            <Text
              style={[
                styles.chipText,
                isActive ? styles.chipTextActive : styles.chipTextInactive,
              ]}
            >
              {chip.label}
              {chip.count !== undefined ? ` (${chip.count})` : ''}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  chip: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs + 3,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipInactive: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  chipText: {
    ...theme.typography.caption,
    fontWeight: '600',
    fontSize: 13,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  chipTextInactive: {
    color: theme.colors.textPrimary,
  },
});
