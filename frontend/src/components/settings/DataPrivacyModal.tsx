import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { PrimaryButton } from '../PrimaryButton';

interface DataPrivacyModalProps {
  visible: boolean;
  onClose: () => void;
}

export const DataPrivacyModal: React.FC<DataPrivacyModalProps> = ({
  visible,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={[styles.dialogCard, theme.shadows.medium]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark" size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Data & Privacy</Text>
              <Text style={styles.subtitle}>How your financial data is protected</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close privacy dialog"
            >
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Principle 1 */}
            <View style={styles.item}>
              <View style={styles.itemHeader}>
                <Ionicons name="lock-closed-outline" size={18} color={theme.colors.primary} />
                <Text style={styles.itemTitle}>End-to-End User Isolation</Text>
              </View>
              <Text style={styles.itemDescription}>
                Every query, summary, category breakdown, and export is strictly scoped to your
                authenticated session ID. No user can ever query or view another user's financial
                records.
              </Text>
            </View>

            {/* Principle 2 */}
            <View style={styles.item}>
              <View style={styles.itemHeader}>
                <Ionicons name="key-outline" size={18} color={theme.colors.primary} />
                <Text style={styles.itemTitle}>Cryptographic Password Hashing</Text>
              </View>
              <Text style={styles.itemDescription}>
                Your passwords are never stored in plaintext and never logged. They are salted and
                hashed using bcrypt (12 work rounds) before touching the database.
              </Text>
            </View>

            {/* Principle 3 */}
            <View style={styles.item}>
              <View style={styles.itemHeader}>
                <Ionicons name="hardware-chip-outline" size={18} color={theme.colors.primary} />
                <Text style={styles.itemTitle}>Secure Local Keyring</Text>
              </View>
              <Text style={styles.itemDescription}>
                Authentication tokens are stored using Expo SecureStore, backed by hardware-backed
                keystores (iOS Keychain / Android Keystore) to resist device extraction.
              </Text>
            </View>

            {/* Principle 4 */}
            <View style={styles.item}>
              <View style={styles.itemHeader}>
                <Ionicons name="download-outline" size={18} color={theme.colors.primary} />
                <Text style={styles.itemTitle}>Data Portability & Erasure</Text>
              </View>
              <Text style={styles.itemDescription}>
                You retain complete ownership of your records. You can export all transactions to
                CSV at any time, or permanently delete your account and all records in one click.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <PrimaryButton title="Got It" onPress={onClose} style={styles.gotItBtn} />
          </View>
        </View>
      </View>
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
    maxWidth: 460,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primaryLight,
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
  body: {
    marginBottom: theme.spacing.md,
  },
  item: {
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surfaceSubtle,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs + 4,
    marginBottom: theme.spacing.xs,
  },
  itemTitle: {
    ...theme.typography.subtitle,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  itemDescription: {
    ...theme.typography.body,
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  footer: {
    marginTop: theme.spacing.xs,
  },
  gotItBtn: {
    width: '100%',
  },
});
