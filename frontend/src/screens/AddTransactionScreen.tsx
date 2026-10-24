import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';
import {
  AddTransactionNavigationProp,
  AddTransactionRouteProp,
} from '../navigation/types';
import { transactionService } from '../services/transactionService';
import { FormInput } from '../components/FormInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { ErrorBanner } from '../components/ErrorBanner';
import { TransactionTypeToggle } from '../components/addTransaction/TransactionTypeToggle';
import { AmountInput } from '../components/addTransaction/AmountInput';
import { CategorySelector } from '../components/addTransaction/CategorySelector';
import { DatePickerField } from '../components/addTransaction/DatePickerField';
import {
  validateTransactionForm,
  ValidationErrors,
} from '../utils/transactionValidation';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../utils/categories';

export const AddTransactionScreen: React.FC = () => {
  const navigation = useNavigation<AddTransactionNavigationProp>();
  const route = useRoute<AddTransactionRouteProp>();
  const { token } = useAuth();

  // Navigation params: initialType
  const initialType = route.params?.initialType || 'EXPENSE';

  // Form State
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>(initialType);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(
    initialType === 'INCOME'
      ? INCOME_CATEGORIES[0].name
      : EXPENSE_CATEGORIES[0].name
  );
  const [date, setDate] = useState<Date>(new Date());
  const [description, setDescription] = useState('');

  // UI State
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync with route params if route changes
  useEffect(() => {
    if (route.params?.initialType) {
      setType(route.params.initialType);
      setCategory(
        route.params.initialType === 'INCOME'
          ? INCOME_CATEGORIES[0].name
          : EXPENSE_CATEGORIES[0].name
      );
    }
  }, [route.params?.initialType]);

  // Handle Type Change
  const handleTypeChange = (newType: 'EXPENSE' | 'INCOME') => {
    setType(newType);
    setCategory(
      newType === 'INCOME'
        ? INCOME_CATEGORIES[0].name
        : EXPENSE_CATEGORIES[0].name
    );
    setErrors((prev) => ({ ...prev, type: undefined }));
  };

  const handleReset = () => {
    setTitle('');
    setAmount('');
    setDescription('');
    setDate(new Date());
    setCategory(
      type === 'INCOME'
        ? INCOME_CATEGORIES[0].name
        : EXPENSE_CATEGORIES[0].name
    );
    setErrors({});
    setServerError(null);
  };

  // Submit Handler
  const handleSubmit = async () => {
    setServerError(null);

    if (!token) {
      setServerError('Authentication session expired. Please log in again.');
      return;
    }

    // Client-side validation
    const validation = validateTransactionForm({
      title,
      amount,
      type,
      category,
      date,
      description,
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      // Build clean payload compatible with backend contract
      // Notice: paymentMethod is NOT in backend Prisma schema, so do NOT send it.
      await transactionService.createTransaction(token, {
        title: title.trim(),
        amount: validation.parsedAmount,
        type,
        category: category.trim(),
        description: description.trim() ? description.trim() : undefined,
        date: date.toISOString(),
      });

      setSaveSuccess(true);

      // Brief delay so user sees success state, then navigate
      setTimeout(() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('MainTabs', { screen: 'Transactions' });
        }
      }, 500);
    } catch (err: any) {
      // Do not clear the form on error
      setServerError(
        err.message ||
          'Failed to record transaction. Please verify details and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isExpense = type === 'EXPENSE';
  const accentColor = isExpense ? theme.colors.error : theme.colors.success;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Back to previous screen"
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>

        <Text style={styles.screenTitle}>
          {isExpense ? 'Add Expense' : 'Add Income'}
        </Text>

        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleReset}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Reset form fields"
        >
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Server Error Banner */}
          <ErrorBanner message={serverError} type="error" />

          {/* Success Banner */}
          {saveSuccess ? (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
              <Text style={styles.successText}>
                {isExpense ? 'Expense' : 'Income'} recorded successfully!
              </Text>
            </View>
          ) : null}

          {/* Transaction Type Segmented Toggle */}
          <TransactionTypeToggle
            type={type}
            onChangeType={handleTypeChange}
            disabled={isSubmitting}
          />

          {/* Amount Card */}
          <View style={[styles.card, theme.shadows.soft]}>
            <AmountInput
              value={amount}
              onChangeText={(val) => {
                setAmount(val);
                if (errors.amount) {
                  setErrors((prev) => ({ ...prev, amount: undefined }));
                }
              }}
              type={type}
              error={errors.amount}
              editable={!isSubmitting}
            />
          </View>

          {/* Primary Form Fields Card */}
          <View style={[styles.card, theme.shadows.soft]}>
            {/* Title / Merchant Input */}
            <FormInput
              label="Title / Merchant"
              placeholder="e.g. Swiggy, Uber, Rent, Salary"
              value={title}
              onChangeText={(val) => {
                setTitle(val);
                if (errors.title) {
                  setErrors((prev) => ({ ...prev, title: undefined }));
                }
              }}
              error={errors.title}
              editable={!isSubmitting}
              leftIcon={
                <Ionicons
                  name="pricetag-outline"
                  size={18}
                  color={theme.colors.textSecondary}
                />
              }
            />

            {/* Category Selector */}
            <CategorySelector
              selectedCategory={category}
              type={type}
              onSelectCategory={(cat) => {
                setCategory(cat);
                if (errors.category) {
                  setErrors((prev) => ({ ...prev, category: undefined }));
                }
              }}
              error={errors.category}
              disabled={isSubmitting}
            />

            {/* Date Field Picker */}
            <DatePickerField
              selectedDate={date}
              onSelectDate={(newDate) => {
                setDate(newDate);
                if (errors.date) {
                  setErrors((prev) => ({ ...prev, date: undefined }));
                }
              }}
              error={errors.date}
              disabled={isSubmitting}
            />

            {/* Optional Multiline Description */}
            <FormInput
              label="Description (Optional)"
              placeholder="Add a note or receipt reference..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              inputStyle={styles.multilineInput}
              editable={!isSubmitting}
              leftIcon={
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color={theme.colors.textSecondary}
                />
              }
            />
          </View>

        </ScrollView>

        {/* Fixed Bottom Save Button Bar */}
        <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
          <PrimaryButton
            title={`Save ${isExpense ? 'Expense' : 'Income'}`}
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting || saveSuccess}
            style={[
              styles.saveButton,
              { backgroundColor: accentColor },
            ]}
            icon={
              <Ionicons
                name="checkmark"
                size={20}
                color="#FFFFFF"
              />
            }
          />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flexOne: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    ...theme.typography.title,
    fontSize: 18,
    color: theme.colors.textPrimary,
  },
  resetButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.sm,
  },
  resetText: {
    ...theme.typography.caption,
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  multilineInput: {
    minHeight: 64,
    textAlignVertical: 'top',
    paddingTop: theme.spacing.sm,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.successLight,
    borderWidth: 1,
    borderColor: theme.colors.successBorder,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    gap: 8,
  },
  successText: {
    ...theme.typography.caption,
    color: '#065F46',
    fontWeight: '700',
    fontSize: 13,
  },
  bottomBar: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 4 : theme.spacing.md,
    ...theme.shadows.medium,
  },
  saveButton: {
    minHeight: 52,
    borderRadius: theme.borderRadius.lg,
  },
});
