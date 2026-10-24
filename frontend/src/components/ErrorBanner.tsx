import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

interface ErrorBannerProps {
  message?: string | null;
  type?: 'error' | 'success' | 'info';
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  type = 'error',
}) => {
  if (!message) return null;

  const isError = type === 'error';
  const isSuccess = type === 'success';

  const containerStyle = [
    styles.container,
    isError
      ? styles.errorContainer
      : isSuccess
      ? styles.successContainer
      : styles.infoContainer,
  ];

  const textStyle = [
    styles.messageText,
    isError ? styles.errorText : isSuccess ? styles.successText : styles.infoText,
  ];

  const iconName = isError
    ? 'alert-circle'
    : isSuccess
    ? 'checkmark-circle'
    : 'information-circle';

  const iconColor = isError
    ? theme.colors.error
    : isSuccess
    ? theme.colors.success
    : theme.colors.primary;

  return (
    <View style={containerStyle} accessibilityRole="alert">
      <Ionicons name={iconName} size={20} color={iconColor} style={styles.icon} />
      <Text style={textStyle}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
  },
  icon: {
    marginRight: theme.spacing.sm,
  },
  messageText: {
    ...theme.typography.body,
    flex: 1,
    fontSize: 13,
  },
  errorContainer: {
    backgroundColor: theme.colors.errorLight,
    borderColor: theme.colors.errorBorder,
  },
  errorText: {
    color: '#B91C1C',
  },
  successContainer: {
    backgroundColor: theme.colors.successLight,
    borderColor: theme.colors.successBorder,
  },
  successText: {
    color: '#047857',
  },
  infoContainer: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.borderActive,
  },
  infoText: {
    color: theme.colors.primaryDark,
  },
});
