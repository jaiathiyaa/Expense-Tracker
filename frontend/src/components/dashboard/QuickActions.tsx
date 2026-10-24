import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

interface QuickActionsProps {
  onAddExpense: () => void;
  onAddIncome: () => void;
  onScanSMS?: () => void;
  onVoiceEntry?: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onAddExpense,
  onAddIncome,
  onScanSMS,
  onVoiceEntry,
}) => {
  const handleScanSMS = () => {
    if (onScanSMS) {
      onScanSMS();
    } else {
      Alert.alert(
        'Scan SMS',
        'SMS transaction parsing is scheduled for an upcoming phase.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleVoiceEntry = () => {
    if (onVoiceEntry) {
      onVoiceEntry();
    } else {
      Alert.alert(
        'Voice Entry',
        'Voice expense logging is scheduled for an upcoming phase.',
        [{ text: 'OK' }]
      );
    }
  };

  const actions = [
    {
      id: 'add_expense',
      label: 'Add Expense',
      icon: 'arrow-up-circle' as const,
      color: theme.colors.error,
      bgColor: '#FEE2E2',
      onPress: onAddExpense,
    },
    {
      id: 'add_income',
      label: 'Add Income',
      icon: 'arrow-down-circle' as const,
      color: theme.colors.success,
      bgColor: '#D1FAE5',
      onPress: onAddIncome,
    },
    {
      id: 'scan_sms',
      label: 'Scan SMS',
      icon: 'chatbubble-ellipses-outline' as const,
      color: theme.colors.primary,
      bgColor: theme.colors.primaryLight,
      onPress: handleScanSMS,
    },
    {
      id: 'voice_entry',
      label: 'Voice Entry',
      icon: 'mic-outline' as const,
      color: '#D97706',
      bgColor: '#FEF3C7',
      onPress: handleVoiceEntry,
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.row}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={[styles.actionCard, theme.shadows.soft]}
            onPress={action.onPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            <View style={[styles.iconContainer, { backgroundColor: action.bgColor }]}>
              <Ionicons name={action.icon} size={22} color={action.color} />
            </View>
            <Text style={styles.actionLabel} numberOfLines={1}>
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xs,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xs + 2,
  },
  actionLabel: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
});
