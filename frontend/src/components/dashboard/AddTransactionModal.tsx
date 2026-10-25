import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { FormInput } from '../FormInput';
import { PrimaryButton } from '../PrimaryButton';
import { ErrorBanner } from '../ErrorBanner';
import { dashboardService } from '../../services/dashboardService';
import { offlineTransactionService } from '../../services/offlineTransactionService';
import { useAuth } from '../../context/AuthContext';

interface AddTransactionModalProps {
  visible: boolean;
  initialType?: 'EXPENSE' | 'INCOME';
  token?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  'Food & Dining',
  'Housing & Rent',
  'Bills & Utilities',
  'Travel & Transport',
  'Work & Salary',
  'Shopping',
  'Entertainment',
  'Health & Medical',
  'Other',
];

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  visible,
  initialType = 'EXPENSE',
  token,
  onClose,
  onSuccess,
}) => {
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>(initialType);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setType(initialType);
    setTitle('');
    setAmount('');
    setError(null);
  }, [visible, initialType]);

  const { user: authUser, token: authToken } = useAuth();
  const effectiveToken = token || authToken;
  const activeUserId = authUser?.id || '';

  const handleSubmit = async () => {
    if (isSubmitting) return; // Prevent double tap
    if (!activeUserId) {
      setError('Please log in to record a transaction.');
      return;
    }

    setError(null);
    const parsedAmount = parseFloat(amount.trim());

    if (!title.trim()) {
      setError('Please provide a transaction title.');
      return;
    }

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      await offlineTransactionService.createTransaction(effectiveToken, activeUserId, {
        title: title.trim(),
        amount: parsedAmount,
        type,
        category,
        date: new Date().toISOString(),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheetContainer}>
          {/* Top Grabber */}
          <View style={styles.grabber} />

          {/* Sheet Header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>
              {type === 'EXPENSE' ? 'Add Expense' : 'Add Income'}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Error Banner */}
            <ErrorBanner message={error} type="error" />

            {/* Type Selector Tabs */}
            <View style={styles.typeSelectorRow}>
              <TouchableOpacity
                style={[
                  styles.typeTab,
                  type === 'EXPENSE' && styles.typeTabExpenseActive,
                ]}
                onPress={() => setType('EXPENSE')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="arrow-up"
                  size={16}
                  color={type === 'EXPENSE' ? '#DC2626' : theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.typeTabText,
                    type === 'EXPENSE' && styles.typeTabTextExpense,
                  ]}
                >
                  Expense
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeTab,
                  type === 'INCOME' && styles.typeTabIncomeActive,
                ]}
                onPress={() => setType('INCOME')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="arrow-down"
                  size={16}
                  color={type === 'INCOME' ? '#059669' : theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.typeTabText,
                    type === 'INCOME' && styles.typeTabTextIncome,
                  ]}
                >
                  Income
                </Text>
              </TouchableOpacity>
            </View>

            {/* Title Input */}
            <FormInput
              label="Title / Merchant"
              placeholder="e.g. Grocery store, Salary, Coffee"
              value={title}
              onChangeText={setTitle}
              editable={!isSubmitting}
            />

            {/* Amount Input */}
            <FormInput
              label="Amount (₹)"
              placeholder="0.00"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              editable={!isSubmitting}
            />

            {/* Category Chips */}
            <Text style={styles.categoryLabel}>Select Category</Text>
            <View style={styles.chipsContainer}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.chip,
                      isSelected && styles.chipSelected,
                    ]}
                    onPress={() => setCategory(cat)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextSelected,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Submit Button */}
            <PrimaryButton
              title={`Save ${type === 'EXPENSE' ? 'Expense' : 'Income'}`}
              onPress={handleSubmit}
              loading={isSubmitting}
              style={styles.submitButton}
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
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
    maxHeight: '85%',
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginBottom: theme.spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  sheetTitle: {
    ...theme.typography.title,
    color: theme.colors.textPrimary,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.borderRadius.md,
    padding: 4,
    marginBottom: theme.spacing.lg,
  },
  typeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  typeTabExpenseActive: {
    backgroundColor: '#FEE2E2',
  },
  typeTabIncomeActive: {
    backgroundColor: '#D1FAE5',
  },
  typeTabText: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  typeTabTextExpense: {
    color: '#DC2626',
  },
  typeTabTextIncome: {
    color: '#059669',
  },
  categoryLabel: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    marginBottom: theme.spacing.xs + 2,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.xl,
  },
  chip: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs + 2,
    borderRadius: theme.borderRadius.full,
    marginRight: theme.spacing.xs + 2,
    marginBottom: theme.spacing.xs + 2,
  },
  chipSelected: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  chipText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  chipTextSelected: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  submitButton: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
});
