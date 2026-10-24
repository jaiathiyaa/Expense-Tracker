import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
  StyleProp,
} from 'react-native';
import { theme } from '../theme';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  accessibilityLabel,
}) => {
  const isInteractive = !loading && !disabled;

  const getContainerStyle = (): StyleProp<ViewStyle> => {
    const base: any[] = [styles.button];

    switch (variant) {
      case 'primary':
        base.push(styles.primaryButton, theme.shadows.button);
        break;
      case 'secondary':
        base.push(styles.secondaryButton);
        break;
      case 'outline':
        base.push(styles.outlineButton);
        break;
      case 'ghost':
        base.push(styles.ghostButton);
        break;
    }

    if (disabled || loading) {
      base.push(styles.disabled);
    }

    if (style) {
      base.push(style);
    }

    return base;
  };

  const getTextStyle = (): StyleProp<TextStyle> => {
    const base: any[] = [styles.text];


    switch (variant) {
      case 'primary':
        base.push(styles.primaryText);
        break;
      case 'secondary':
        base.push(styles.secondaryText);
        break;
      case 'outline':
        base.push(styles.outlineText);
        break;
      case 'ghost':
        base.push(styles.ghostText);
        break;
    }

    if (textStyle) {
      base.push(textStyle);
    }

    return base;
  };

  const getIndicatorColor = () => {
    if (variant === 'primary') return theme.colors.textLight;
    return theme.colors.primary;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={isInteractive ? onPress : undefined}
      style={getContainerStyle()}
      disabled={!isInteractive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: !isInteractive, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getIndicatorColor()} />
      ) : (
        <View style={styles.contentRow}>
          {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
          <Text style={getTextStyle()}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    flexDirection: 'row',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: theme.spacing.sm,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  secondaryButton: {
    backgroundColor: theme.colors.primaryLight,
  },
  outlineButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  ghostButton: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    ...theme.typography.button,
  },
  primaryText: {
    color: theme.colors.textLight,
  },
  secondaryText: {
    color: theme.colors.primary,
  },
  outlineText: {
    color: theme.colors.textPrimary,
  },
  ghostText: {
    color: theme.colors.primary,
  },
});
