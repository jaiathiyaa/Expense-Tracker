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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { FormInput } from '../FormInput';
import { PrimaryButton } from '../PrimaryButton';
import { ErrorBanner } from '../ErrorBanner';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { user, token, updateUser } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();
  const [emailError, setEmailError] = useState<string | undefined>();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible && user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setNameError(undefined);
      setEmailError(undefined);
      setServerError(null);
      setSuccessMessage(null);
      setIsSaving(false);
    }
  }, [visible, user]);

  const validate = (): boolean => {
    let isValid = true;
    setNameError(undefined);
    setEmailError(undefined);
    setServerError(null);

    if (!name.trim()) {
      setNameError('Full name cannot be empty.');
      isValid = false;
    } else if (name.trim().length < 2) {
      setNameError('Name must be at least 2 characters long.');
      isValid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setEmailError('Email address cannot be empty.');
      isValid = false;
    } else if (!emailRegex.test(email.trim().toLowerCase())) {
      setEmailError('Please enter a valid email address.');
      isValid = false;
    }

    return isValid;
  };

  const handleSave = async () => {
    if (!validate() || !token) return;

    try {
      setIsSaving(true);
      setServerError(null);
      setSuccessMessage(null);

      const response = await authService.updateProfile(token, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
      });

      if (response && response.user) {
        updateUser(response.user);
        setSuccessMessage('Profile updated successfully!');
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1000);
      }
    } catch (err: any) {
      setServerError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
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
              <Text style={styles.title}>Edit Profile</Text>
              <Text style={styles.subtitle}>Update your account details</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close edit profile dialog"
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

            <FormInput
              label="Full Name"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (nameError) setNameError(undefined);
              }}
              placeholder="e.g. Jane Doe"
              error={nameError}
              autoCapitalize="words"
              editable={!isSaving}
              leftIcon={
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={nameError ? theme.colors.error : theme.colors.textSecondary}
                />
              }
            />

            <FormInput
              label="Email Address"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (emailError) setEmailError(undefined);
              }}
              placeholder="e.g. jane@example.com"
              error={emailError}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSaving}
              leftIcon={
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={emailError ? theme.colors.error : theme.colors.textSecondary}
                />
              }
              helperText="Your email is used for sign-in and account security."
            />

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                disabled={isSaving}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <PrimaryButton
                title={isSaving ? 'Saving...' : 'Save Changes'}
                onPress={handleSave}
                loading={isSaving}
                disabled={isSaving}
                style={styles.saveBtn}
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
  saveBtn: {
    flex: 1,
  },
});
