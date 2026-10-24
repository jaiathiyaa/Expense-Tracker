import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

export type PaymentMethod = 'UPI' | 'Cash' | 'Debit Card' | 'Credit Card';

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod;
  onSelectMethod: (method: PaymentMethod) => void;
  disabled?: boolean;
}

const METHODS: { id: PaymentMethod; label: string; icon: any }[] = [
  { id: 'UPI', label: 'UPI', icon: 'qr-code-outline' },
  { id: 'Cash', label: 'Cash', icon: 'cash-outline' },
  { id: 'Debit Card', label: 'Debit Card', icon: 'card-outline' },
  { id: 'Credit Card', label: 'Credit Card', icon: 'wallet-outline' },
];

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  selectedMethod,
  onSelectMethod,
  disabled = false,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Payment Method</Text>
        <View style={styles.betaBadge}>
          <Text style={styles.betaText}>Local Tag</Text>
        </View>
      </View>

      <View style={styles.grid}>
        {METHODS.map((m) => {
          const isSelected = selectedMethod === m.id;
          return (
            <TouchableOpacity
              key={m.id}
              style={[
                styles.methodChip,
                isSelected && styles.methodChipSelected,
                disabled && styles.disabledChip,
              ]}
              onPress={() => onSelectMethod(m.id)}
              activeOpacity={0.7}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={`Select ${m.label} payment method`}
              accessibilityState={{ selected: isSelected }}
            >
              <Ionicons
                name={m.icon}
                size={16}
                color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.methodLabel,
                  isSelected && styles.methodLabelSelected,
                ]}
              >
                {m.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.disclaimerText}>
        Backend note: Database schema migration is required to persist payment method across sessions.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.lg,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs + 2,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    fontSize: 13,
  },
  betaBadge: {
    marginLeft: theme.spacing.sm,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  betaText: {
    ...theme.typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  methodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    gap: 6,
  },
  methodChipSelected: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  disabledChip: {
    opacity: 0.6,
  },
  methodLabel: {
    ...theme.typography.caption,
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  methodLabelSelected: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  disclaimerText: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 6,
    fontStyle: 'italic',
  },
});
