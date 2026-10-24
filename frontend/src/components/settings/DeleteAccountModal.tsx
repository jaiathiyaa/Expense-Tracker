import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { PasswordInput } from '../PasswordInput';
import { PrimaryButton } from '../PrimaryButton';
import { ErrorBanner } from '../ErrorBanner';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  visible,
  onClose,
}) => {
  const { token, logout } = useAuth();

  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (visible) {
      setPassword('');
      setPasswordError(undefined);
      setServerError(null);
      setIsDeleting(false);
    }
  }, [visible]);

  const handleDelete = async () => {
    setServerError(null);
    setPasswordError(undefined);

    if (!password) {
      setPasswordError('Please enter your password to confirm account deletion.');
      return;
    }

    if (!token) return;

    try {
      setIsDeleting(true);
      await authService.deleteAccount(token, { password });
      onClose();
      await logout();
    } catch (err: any) {
      setServerError(
        err.message || 'Failed to delete account. Please verify your password.'
      );
    } finally {
      setIsDeleting(false);
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
            <View style={styles.iconCircle}>
              <Ionicons name="warning" size={24} color={theme.colors.error} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Delete Account?</Text>
              <Text style={styles.subtitle}>This action is permanent and irreversible</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close delete account dialog"
            >
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Warning notice */}
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              All your expense records, categories, income history, and personal profile data
              will be permanently erased from our database.
            </Text>
          </View>

          {serverError ? (
            <ErrorBanner message={serverError} />
          ) : null}

          <PasswordInput
            label="Confirm Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (passwordError) setPasswordError(undefined);
            }}
            placeholder="Enter your password to confirm"
            error={passwordError}
            editable={!isDeleting}
            helperText="Enter your current password to authorize permanent deletion."
          />

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={isDeleting}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <PrimaryButton
              title={isDeleting ? 'Deleting...' : 'Delete My Account'}
              onPress={handleDelete}
              loading={isDeleting}
              disabled={isDeleting}
              style={[styles.deleteBtn, { backgroundColor: theme.colors.error }]}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  headerText: {
    flex: 1,
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
  warningBox: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  warningText: {
    ...theme.typography.body,
    fontSize: 13,
    lineHeight: 19,
    color: '#9F1239',
  },
  banner: {
    marginBottom: theme.spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
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
  deleteBtn: {
    flex: 1,
  },
});
