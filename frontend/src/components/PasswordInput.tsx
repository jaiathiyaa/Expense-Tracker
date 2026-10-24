import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FormInput, FormInputProps } from './FormInput';
import { theme } from '../theme';

interface PasswordInputProps extends Omit<FormInputProps, 'rightIcon'> {
  showToggle?: boolean;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  showToggle = true,
  ...props
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    setIsVisible((prev) => !prev);
  };

  const rightIcon = showToggle ? (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={toggleVisibility}
      style={styles.toggleButton}
      accessibilityRole="button"
      accessibilityLabel={isVisible ? 'Hide password' : 'Show password'}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons
        name={isVisible ? 'eye-off-outline' : 'eye-outline'}
        size={20}
        color={theme.colors.textSecondary}
      />
    </TouchableOpacity>
  ) : undefined;

  return (
    <FormInput
      secureTextEntry={!isVisible}
      autoCapitalize="none"
      autoCorrect={false}
      rightIcon={rightIcon}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  toggleButton: {
    padding: theme.spacing.xs,
  },
});
