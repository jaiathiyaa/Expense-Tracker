import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useSettings } from '../../context/SettingsContext';
import { FormInput } from '../FormInput';
import { PrimaryButton } from '../PrimaryButton';
import { ParsedSmsTransaction } from '../../services/smsParserService';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../utils/categories';

interface EditParsedTransactionModalProps {
  visible: boolean;
  transaction: ParsedSmsTransaction | null;
  onClose: () => void;
  onSave: (updated: ParsedSmsTransaction) => void;
}

export const EditParsedTransactionModal: React.FC<EditParsedTransactionModalProps> = ({
  visible,
  transaction,
  onClose,
  onSave,
}) => {
  const { isDark, currencyInfo } = useSettings();

  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [category, setCategory] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (transaction) {
      setTitle(transaction.title || '');
      setAmountStr(transaction.amount ? transaction.amount.toString() : '');
      setType(transaction.type);
      setCategory(transaction.category || (transaction.type === 'INCOME' ? 'Salary' : 'Food & Dining'));
      setDateStr(transaction.date || new Date().toISOString().split('T')[0]);
      setError(null);
    }
  }, [transaction]);

  const categories = type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSave = () => {
    if (!title.trim()) {
      setError('Title / Merchant cannot be empty');
      return;
    }

    const parsedAmount = parseFloat(amountStr);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid positive amount');
      return;
    }

    if (!dateStr.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
      setError('Date must be in YYYY-MM-DD format');
      return;
    }

    if (!transaction) return;

    const updated: ParsedSmsTransaction = {
      ...transaction,
      title: title.trim(),
      amount: parsedAmount,
      type,
      category,
      date: dateStr.trim(),
      isValid: true,
      parseError: undefined,
    };

    onSave(updated);
    onClose();
  };

  if (!transaction) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalCard, isDark && styles.modalCardDark, theme.shadows.medium]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconPill, { backgroundColor: isDark ? '#1E1B4B' : theme.colors.primaryLight }]}>
                <Ionicons name="create" size={18} color={theme.colors.primary} />
              </View>
              <Text style={[styles.title, isDark && styles.textLight]}>Edit Transaction</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close edit modal"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color={isDark ? '#94A3B8' : theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={theme.colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Type Switcher */}
            <Text style={[styles.label, isDark && styles.labelDark]}>Transaction Type</Text>
            <View style={[styles.typeToggleContainer, isDark && styles.typeToggleContainerDark]}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  type === 'EXPENSE' && [styles.typeButtonExpense, theme.shadows.soft],
                ]}
                onPress={() => {
                  setType('EXPENSE');
                  setCategory(EXPENSE_CATEGORIES[0].name);
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="arrow-up-circle"
                  size={16}
                  color={type === 'EXPENSE' ? '#EF4444' : theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.typeButtonText,
                    type === 'EXPENSE' && { color: '#EF4444', fontWeight: '700' },
                  ]}
                >
                  Expense
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeButton,
                  type === 'INCOME' && [styles.typeButtonIncome, theme.shadows.soft],
                ]}
                onPress={() => {
                  setType('INCOME');
                  setCategory(INCOME_CATEGORIES[0].name);
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="arrow-down-circle"
                  size={16}
                  color={type === 'INCOME' ? '#10B981' : theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.typeButtonText,
                    type === 'INCOME' && { color: '#10B981', fontWeight: '700' },
                  ]}
                >
                  Income
                </Text>
              </TouchableOpacity>
            </View>

            {/* Title / Merchant */}
            <FormInput
              label="Merchant / Title"
              value={title}
              onChangeText={(text: string) => {
                setTitle(text);
                if (error) setError(null);
              }}
              placeholder="e.g. Swiggy, Amazon, Metro"
              leftIcon={<Ionicons name="business-outline" size={18} color={theme.colors.textSecondary} />}
            />

            {/* Amount */}
            <FormInput
              label={`Amount (${currencyInfo.symbol} ${currencyInfo.code})`}
              value={amountStr}
              onChangeText={(text: string) => {
                setAmountStr(text);
                if (error) setError(null);
              }}
              placeholder="0.00"
              keyboardType="decimal-pad"
              leftIcon={<Ionicons name="cash-outline" size={18} color={theme.colors.textSecondary} />}
            />

            {/* Date */}
            <FormInput
              label="Date (YYYY-MM-DD)"
              value={dateStr}
              onChangeText={(text: string) => {
                setDateStr(text);
                if (error) setError(null);
              }}
              placeholder="2026-10-23"
              leftIcon={<Ionicons name="calendar-outline" size={18} color={theme.colors.textSecondary} />}
            />

            {/* Category Selector */}
            <Text style={[styles.label, isDark && styles.labelDark]}>Category</Text>
            <View style={styles.categoryWrap}>
              {categories.map((cat) => {
                const isSelected = category === cat.name;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      isDark && styles.categoryChipDark,
                      isSelected && {
                        backgroundColor: isDark ? '#1E1B4B' : cat.bgColor,
                        borderColor: cat.color,
                        borderWidth: 1.5,
                      },
                    ]}
                    onPress={() => setCategory(cat.name)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={cat.icon}
                      size={14}
                      color={isSelected ? cat.color : theme.colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        isSelected && { color: cat.color, fontWeight: '700' },
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.cancelBtn, isDark && styles.cancelBtnDark]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelBtnText, isDark && styles.textLight]}>Cancel</Text>
            </TouchableOpacity>

            <PrimaryButton
              title="Save Changes"
              onPress={handleSave}
              style={styles.saveBtn}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalCardDark: {
    backgroundColor: '#151C2C',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  title: {
    ...theme.typography.title,
    fontSize: 18,
    color: theme.colors.textPrimary,
  },
  textLight: {
    color: '#F8FAFC',
  },
  closeBtn: {
    padding: 6,
  },
  formScroll: {
    maxHeight: 420,
    marginBottom: theme.spacing.md,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.error,
    marginLeft: 6,
    fontWeight: '600',
  },
  label: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 8,
  },
  labelDark: {
    color: '#94A3B8',
  },
  typeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: theme.borderRadius.lg,
    padding: 4,
    marginBottom: theme.spacing.sm,
  },
  typeToggleContainerDark: {
    backgroundColor: '#1E293B',
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
  },
  typeButtonExpense: {
    backgroundColor: '#FFFFFF',
  },
  typeButtonIncome: {
    backgroundColor: '#FFFFFF',
  },
  typeButtonText: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginLeft: 6,
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.full,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryChipDark: {
    backgroundColor: '#1E293B',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginLeft: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: '#F1F5F9',
  },
  cancelBtnDark: {
    backgroundColor: '#1E293B',
  },
  cancelBtnText: {
    ...theme.typography.button,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  saveBtn: {
    minHeight: 46,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
});
