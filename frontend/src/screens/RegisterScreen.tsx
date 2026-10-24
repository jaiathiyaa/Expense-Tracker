import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { FormInput } from '../components/FormInput';
import { PasswordInput } from '../components/PasswordInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { AuthHeader } from '../components/AuthHeader';
import { ErrorBanner } from '../components/ErrorBanner';
import { useAuth } from '../context/AuthContext';
import { RegisterNavigationProp } from '../navigation/types';
import { ApiError } from '../api/types';

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<RegisterNavigationProp>();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    let isValid = true;
    setNameError('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setApiError(null);

    // Name validation
    if (!name.trim()) {
      setNameError('Full name is required.');
      isValid = false;
    }

    // Email validation
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError('Email is required.');
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        setEmailError('Please enter a valid email address.');
        isValid = false;
      }
    }

    // Password validation (at least 8 chars matching backend rule)
    if (!password) {
      setPasswordError('Password is required.');
      isValid = false;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      isValid = false;
    }

    // Confirm password validation
    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password.');
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match.');
      isValid = false;
    }

    return isValid;
  };

  const handleRegister = async () => {
    if (isSubmitting) return;

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setApiError(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      await register({
        name: name.trim(),
        email: normalizedEmail,
        password: password,
      });

      // Backend returns { message, user } without token.
      // Navigate to Login screen and pass email to prompt user to log in.
      navigation.navigate('Login', {
        registeredEmail: normalizedEmail,
        registrationSuccess: true,
      });
    } catch (error: any) {
      if (error instanceof ApiError) {
        setApiError(error.message);
      } else {
        setApiError('Unable to create account. Please check your connection and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header with back button */}
          <AuthHeader
            title="Create an account"
            subtitle="Start your journey toward financial clarity."
            onBack={() => navigation.goBack()}
            showBack={true}
          />

          {/* Feedback Banner */}
          <ErrorBanner message={apiError} type="error" />

          {/* Form Fields Card */}
          <View style={styles.formCard}>
            <FormInput
              label="Full Name"
              placeholder="e.g. Alex Morgan"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (nameError) setNameError('');
                if (apiError) setApiError(null);
              }}
              autoCapitalize="words"
              autoCorrect={false}
              error={nameError}
              leftIcon={
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={nameError ? theme.colors.error : theme.colors.textSecondary}
                />
              }
              editable={!isSubmitting}
            />

            <FormInput
              label="Email Address"
              placeholder="you@example.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (emailError) setEmailError('');
                if (apiError) setApiError(null);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              error={emailError}
              leftIcon={
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={emailError ? theme.colors.error : theme.colors.textSecondary}
                />
              }
              editable={!isSubmitting}
            />

            <PasswordInput
              label="Password"
              placeholder="At least 8 characters"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (passwordError) setPasswordError('');
                if (confirmPassword && confirmPasswordError && text === confirmPassword) {
                  setConfirmPasswordError('');
                }
                if (apiError) setApiError(null);
              }}
              error={passwordError}
              helperText={!passwordError ? 'Minimum 8 characters' : undefined}
              leftIcon={
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={passwordError ? theme.colors.error : theme.colors.textSecondary}
                />
              }
              editable={!isSubmitting}
            />

            <PasswordInput
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (confirmPasswordError) setConfirmPasswordError('');
                if (apiError) setApiError(null);
              }}
              error={confirmPasswordError}
              leftIcon={
                <Ionicons
                  name="shield-outline"
                  size={20}
                  color={confirmPasswordError ? theme.colors.error : theme.colors.textSecondary}
                />
              }
              editable={!isSubmitting}
            />

            {/* Submit Button */}
            <PrimaryButton
              title="Create Account"
              onPress={handleRegister}
              loading={isSubmitting}
              disabled={isSubmitting}
              style={styles.submitButton}
            />
          </View>

          {/* Footer - Switch to Login */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.7}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Log in to existing account"
            >
              <Text style={styles.footerLink}>Log In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
    justifyContent: 'space-between',
  },
  formCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.soft,
  },
  submitButton: {
    marginTop: theme.spacing.md,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.xxl,
    paddingVertical: theme.spacing.md,
  },
  footerText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  footerLink: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
  },
});
