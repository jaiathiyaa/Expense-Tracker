import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { formatINR } from '../../utils/formatters';
import { CategoryItem } from '../../services/dashboardService';

interface CategoryBreakdownProps {
  categories: CategoryItem[];
  onViewAll?: () => void;
}

// Icon and color mapping for standard expense categories
const getCategoryMetadata = (categoryName: string | null) => {
  const norm = (categoryName || '').toLowerCase().trim();

  if (norm.includes('food') || norm.includes('grocer') || norm.includes('dining')) {
    return { icon: 'restaurant-outline' as const, color: '#F59E0B', bg: '#FEF3C7' };
  }
  if (norm.includes('house') || norm.includes('rent') || norm.includes('home')) {
    return { icon: 'home-outline' as const, color: '#3B82F6', bg: '#DBEAFE' };
  }
  if (norm.includes('travel') || norm.includes('flight') || norm.includes('transport') || norm.includes('fuel')) {
    return { icon: 'airplane-outline' as const, color: '#8B5CF6', bg: '#EDE9FE' };
  }
  if (norm.includes('bill') || norm.includes('util') || norm.includes('electric') || norm.includes('water')) {
    return { icon: 'flash-outline' as const, color: '#EF4444', bg: '#FEE2E2' };
  }
  if (norm.includes('entertain') || norm.includes('movie') || norm.includes('game')) {
    return { icon: 'film-outline' as const, color: '#EC4899', bg: '#FCE7F3' };
  }
  if (norm.includes('shop') || norm.includes('cloth')) {
    return { icon: 'bag-handle-outline' as const, color: '#10B981', bg: '#D1FAE5' };
  }
  if (norm.includes('health') || norm.includes('med')) {
    return { icon: 'medkit-outline' as const, color: '#14B8A6', bg: '#CCFBF1' };
  }
  if (norm.includes('work') || norm.includes('office')) {
    return { icon: 'briefcase-outline' as const, color: '#6366F1', bg: '#EEF2FF' };
  }

  // Default fallback
  return { icon: 'pricetag-outline' as const, color: theme.colors.primary, bg: theme.colors.primaryLight };
};

export const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({
  categories = [],
  onViewAll,
}) => {
  // Calculate total expense sum across all returned categories
  const totalExpenseSum = categories.reduce((sum, item) => sum + (item.total || 0), 0);

  return (
    <View style={styles.container}>
      <View style={[styles.card, theme.shadows.soft]}>
        {/* Card Header */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Spending by Category</Text>
          {categories.length > 0 && onViewAll ? (
            <TouchableOpacity
              onPress={onViewAll}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Categories List */}
        {categories.length > 0 ? (
          <View style={styles.categoryList}>
            {categories.map((item, index) => {
              const categoryName = item.category || 'Uncategorized';
              const meta = getCategoryMetadata(categoryName);
              const percentage =
                totalExpenseSum > 0 ? (item.total / totalExpenseSum) * 100 : 0;

              return (
                <View key={index} style={styles.categoryItem}>
                  <View style={styles.categoryTopRow}>
                    <View style={styles.categoryLeft}>
                      <View style={[styles.iconBox, { backgroundColor: meta.bg }]}>
                        <Ionicons name={meta.icon} size={18} color={meta.color} />
                      </View>
                      <View>
                        <Text style={styles.categoryName}>{categoryName}</Text>
                        <Text style={styles.percentageText}>
                          {percentage.toFixed(1)}% of total
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.categoryTotal}>{formatINR(item.total)}</Text>
                  </View>

                  {/* Proportional Progress Bar */}
                  <View style={styles.progressBarBackground}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(Math.max(percentage, 3), 100)}%`,
                          backgroundColor: meta.color,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="pie-chart-outline" size={32} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>No expense categories yet</Text>
            <Text style={styles.emptySubtitle}>
              Log expenses with categories to see your spending distribution here.
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.subtitle,
    color: theme.colors.textPrimary,
  },
  viewAllText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  categoryList: {
    marginTop: theme.spacing.xs,
  },
  categoryItem: {
    marginBottom: theme.spacing.md,
  },
  categoryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  categoryName: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
    fontSize: 14,
  },
  percentageText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  categoryTotal: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
    fontSize: 14,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
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
    paddingHorizontal: theme.spacing.md,
  },
});
