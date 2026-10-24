import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { PrimaryButton } from '../PrimaryButton';

export interface FilterOptions {
  dateRangePreset: 'ALL' | 'THIS_MONTH' | 'LAST_30_DAYS' | 'LAST_90_DAYS';
  startDate?: string;
  endDate?: string;
  order: 'desc' | 'asc';
}

interface TransactionFilterModalProps {
  visible: boolean;
  currentFilters: FilterOptions;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
  onReset: () => void;
}

export const TransactionFilterModal: React.FC<TransactionFilterModalProps> = ({
  visible,
  currentFilters,
  onClose,
  onApply,
  onReset,
}) => {
  const [preset, setPreset] = useState<FilterOptions['dateRangePreset']>(
    currentFilters.dateRangePreset
  );
  const [order, setOrder] = useState<'desc' | 'asc'>(currentFilters.order);

  const handleApply = () => {
    let startDate: string | undefined = undefined;
    let endDate: string | undefined = undefined;

    const now = new Date();
    const endStr = now.toISOString().split('T')[0];

    if (preset === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate = firstDay.toISOString().split('T')[0];
      endDate = endStr;
    } else if (preset === 'LAST_30_DAYS') {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate = past30.toISOString().split('T')[0];
      endDate = endStr;
    } else if (preset === 'LAST_90_DAYS') {
      const past90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      startDate = past90.toISOString().split('T')[0];
      endDate = endStr;
    }

    onApply({
      dateRangePreset: preset,
      startDate,
      endDate,
      order,
    });
    onClose();
  };

  const handleReset = () => {
    setPreset('ALL');
    setOrder('desc');
    onReset();
    onClose();
  };

  const datePresets = [
    { key: 'ALL' as const, label: 'All Time' },
    { key: 'THIS_MONTH' as const, label: 'This Month' },
    { key: 'LAST_30_DAYS' as const, label: 'Last 30 Days' },
    { key: 'LAST_90_DAYS' as const, label: 'Last 90 Days' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheetContainer}>
          <View style={styles.grabber} />

          <View style={styles.header}>
            <Text style={styles.title}>Filter Transactions</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Date Range Section */}
            <Text style={styles.sectionHeader}>Date Range</Text>
            <View style={styles.chipGrid}>
              {datePresets.map((p) => {
                const isSelected = preset === p.key;
                return (
                  <TouchableOpacity
                    key={p.key}
                    style={[
                      styles.filterChip,
                      isSelected && styles.filterChipActive,
                    ]}
                    onPress={() => setPreset(p.key)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        isSelected && styles.filterChipTextActive,
                      ]}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Sort Order Section */}
            <Text style={styles.sectionHeader}>Sort by Date</Text>
            <View style={styles.chipGrid}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  order === 'desc' && styles.filterChipActive,
                ]}
                onPress={() => setOrder('desc')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    order === 'desc' && styles.filterChipTextActive,
                  ]}
                >
                  Newest First
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterChip,
                  order === 'asc' && styles.filterChipActive,
                ]}
                onPress={() => setOrder('asc')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    order === 'asc' && styles.filterChipTextActive,
                  ]}
                >
                  Oldest First
                </Text>
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <PrimaryButton
                title="Reset"
                variant="outline"
                onPress={handleReset}
                style={styles.resetButton}
              />
              <PrimaryButton
                title="Apply Filters"
                variant="primary"
                onPress={handleApply}
                style={styles.applyButton}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xxl,
    maxHeight: '75%',
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginBottom: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.textPrimary,
  },
  closeBtn: {
    padding: theme.spacing.xs,
  },
  sectionHeader: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  filterChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  resetButton: {
    flex: 1,
  },
  applyButton: {
    flex: 2,
  },
});
