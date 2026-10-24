import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { PasswordInput } from '../PasswordInput';
import { PrimaryButton } from '../PrimaryButton';
import { ErrorBanner } from '../ErrorBanner';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { token } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [currentPasswordError, setCurrentPasswordError] = useState<string | undefined>();
  const [newPasswordError, setNewPasswordError] = useState<string | undefined>();
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | undefined>();

  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPasswordError(undefined);
      setNewPasswordError(undefined);
      setConfirmPasswordError(undefined);
      setServerError(null);
      setSuccessMessage(null);
      setIsSubmitting(false);
    }
  }, [visible]);

  const validate = (): boolean => {
    let isValid = true;
    setCurrentPasswordError(undefined);
    setNewPasswordError(undefined);
    setConfirmPasswordError(undefined);
    setServerError(null);

    if (!currentPassword) {
      setCurrentPasswordError('Please enter your current password.');
      isValid = false;
    }

    if (!newPassword) {
      setNewPasswordError('Please enter a new password.');
      isValid = false;
    } else if (newPassword.length < 8) {
      setNewPasswordError('New password must be at least 8 characters.');
      isValid = false;
    } else if (newPassword === currentPassword) {
      setNewPasswordError('New password must be different from current password.');
      isValid = false;
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your new password.');
      isValid = false;
    } else if (confirmPassword !== newPassword) {
      setConfirmPasswordError('Passwords do not match.');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async () => {
    if (!validate() || !token) return;

    try {
      setIsSubmitting(true);
      setServerError(null);
      setSuccessMessage(null);

      const response = await authService.changePassword(token, {
        currentPassword,
        newPassword,
      });

      setSuccessMessage(response.message || 'Password updated successfully!');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1200);
    } catch (err: any) {
      setServerError(err.message || 'Failed to update password. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={[styles.dialogCard, theme.shadows.medium]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Change Password</Text>
              <Text style={styles.subtitle}>Protect your account with a strong password</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close change password dialog"
            >
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.formContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {serverError ? (
              <ErrorBanner message={serverError} />
            ) : null}

            {successMessage ? (
              <View style={styles.successBanner}>
                <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            ) : null}

            <PasswordInput
              label="Current Password"
              value={currentPassword}
              onChangeText={(text) => {
                setCurrentPassword(text);
                if (currentPasswordError) setCurrentPasswordError(undefined);
              }}
              placeholder="Enter current password"
              error={currentPasswordError}
              editable={!isSubmitting}
            />

            <PasswordInput
              label="New Password"
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
                if (newPasswordError) setNewPasswordError(undefined);
              }}
              placeholder="Minimum 8 characters"
              error={newPasswordError}
              editable={!isSubmitting}
              helperText="Must be at least 8 characters and different from current password."
            />

            <PasswordInput
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (confirmPasswordError) setConfirmPasswordError(undefined);
              }}
              placeholder="Re-enter new password"
              error={confirmPasswordError}
              editable={!isSubmitting}
            />

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <PrimaryButton
                title={isSubmitting ? 'Updating...' : 'Update Password'}
                onPress={handleSubmit}
                loading={isSubmitting}
                disabled={isSubmitting}
                style={styles.submitBtn}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.lg,
  },
  title: {
    ...theme.typography.title,
    fontSize: 20,
    color: theme.colors.textPrimary,
  },
  subtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  formContainer: {
    paddingBottom: theme.spacing.xs,
  },
  banner: {
    marginBottom: theme.spacing.md,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.successLight,
    borderWidth: 1,
    borderColor: theme.colors.successBorder,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  successText: {
    ...theme.typography.caption,
    color: '#065F46',
    fontWeight: '600',
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    gap: theme.spacing.md,
  },
  cancelBtn: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
  },
  cancelBtnText: {
    ...theme.typography.button,
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  submitBtn: {
    flex: 1,
  },
});
