import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../../theme';
import { TimeRange } from '../../utils/insightsHelpers';

interface TimeRangeSelectorProps {
  selected: TimeRange;
  onSelect: (range: TimeRange) => void;
}

const RANGES: { key: TimeRange; label: string }[] = [
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: '3months', label: '3 Months' },
  { key: '1year', label: '1 Year' },
];

export const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  selected,
  onSelect,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.pill}>
        {RANGES.map(({ key, label }) => {
          const isActive = selected === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => onSelect(key)}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${label} time range`}
            >
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
  },
  pill: {
    flexDirection: 'row',
    backgroundColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.md,
  },
  tabActive: {
    backgroundColor: theme.colors.surface,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    letterSpacing: 0.1,
  },
  tabLabelActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
});
