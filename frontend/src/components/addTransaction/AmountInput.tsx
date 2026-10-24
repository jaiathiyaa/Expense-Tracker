import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { theme } from '../../theme';

interface AmountInputProps {
  value: string;
  onChangeText: (value: string) => void;
  type: 'EXPENSE' | 'INCOME';
  error?: string;
  editable?: boolean;
}

export const AmountInput: React.FC<AmountInputProps> = ({
  value,
  onChangeText,
  type,
  error,
  editable = true,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleTextChange = (input: string) => {
    // Sanitize input: allow only digits and at most one decimal point
    let cleaned = input.replace(/[^0-9.]/g, '');

    // Allow only one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }

    // Limit decimal places to 2
    if (parts.length === 2 && parts[1].length > 2) {
      cleaned = parts[0] + '.' + parts[1].substring(0, 2);
    }

    onChangeText(cleaned);
  };

  const isExpense = type === 'EXPENSE';
  const accentColor = isExpense ? theme.colors.error : theme.colors.success;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Amount</Text>

      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          error ? styles.inputContainerError : null,
        ]}
      >
        <View style={[styles.currencyBadge, { backgroundColor: isExpense ? '#FEE2E2' : '#D1FAE5' }]}>
          <Text style={[styles.currencySymbol, { color: accentColor }]}>₹</Text>
        </View>

        <TextInput
          style={[
            styles.amountText,
            { color: value ? theme.colors.textPrimary : theme.colors.textMuted },
          ]}
          value={value}
          onChangeText={handleTextChange}
          placeholder="0.00"
          placeholderTextColor={theme.colors.textMuted}
          keyboardType="decimal-pad"
          editable={editable}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          accessibilityLabel="Transaction amount in rupees"
          maxLength={12}
        />

        {value.length > 0 && editable ? (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => onChangeText('')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Clear amount"
          >
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? (
        <Text style={styles.errorText} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    marginBottom: theme.spacing.xs + 2,
    fontSize: 13,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    minHeight: 64,
  },
  inputContainerFocused: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.soft,
  },
  inputContainerError: {
    borderColor: theme.colors.error,
    backgroundColor: '#FFF8F8',
  },
  currencyBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  currencySymbol: {
    fontSize: 22,
    fontWeight: '700',
  },
  amountText: {
    flex: 1,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
    paddingVertical: 8,
  },
  clearBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  },
});
