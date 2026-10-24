import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { CurrencyPickerModal } from '../components/settings/CurrencyPickerModal';
import { ChangePasswordModal } from '../components/settings/ChangePasswordModal';
import { DeleteAccountModal } from '../components/settings/DeleteAccountModal';
import { DataPrivacyModal } from '../components/settings/DataPrivacyModal';

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { logout } = useAuth();
  const {
    currencyInfo,
    appearance,
    isDark,
    setAppearance,
    notificationsEnabled,
    setNotificationsEnabled,
    exportTransactions,
    isExporting,
  } = useSettings();

  // Modals state
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  const [deleteAccountModalVisible, setDeleteAccountModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);

  // Export status feedback
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async () => {
    setExportNotice(null);
    setExportError(null);
    try {
      const result = await exportTransactions();
      const count = result.rowCount !== undefined ? result.rowCount : 0;
      const msg = `Successfully exported ${count} transaction${count === 1 ? '' : 's'} to CSV.`;
      setExportNotice(msg);
      if (Platform.OS !== 'web') {
        Alert.alert('Export Complete', msg);
      }
    } catch (err: any) {
      setExportError(err.message || 'Failed to export transactions.');
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to log out?');
      if (confirmed) {
        logout();
      }
      return;
    }

    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back to profile"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={isDark ? '#F8FAFC' : theme.colors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* GROUP 1: PREFERENCES */}
        <Text style={styles.groupHeader}>Preferences</Text>
        <View style={[styles.cardGroup, theme.shadows.soft]}>
          {/* Currency Preference */}
          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={() => setCurrencyModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={`Currency preference, currently ${currencyInfo.name}`}
          >
            <View style={[styles.iconBadge, { backgroundColor: theme.colors.primaryLight }]}>
              <Ionicons name="cash-outline" size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Display Currency</Text>
              <Text style={styles.rowSubtitle}>{currencyInfo.name}</Text>
            </View>
            <View style={styles.rowTrailing}>
              <Text style={styles.currencyCodeBadge}>{currencyInfo.code}</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Appearance Preference */}
          <View style={styles.rowItem}>
            <View style={[styles.iconBadge, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
              <Ionicons
                name={isDark ? 'moon' : 'sunny'}
                size={20}
                color={isDark ? '#F59E0B' : '#475569'}
              />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Theme & Appearance</Text>
              <Text style={styles.rowSubtitle}>
                {appearance === 'system'
                  ? `System (${isDark ? 'Dark Mode' : 'Light Mode'})`
                  : appearance === 'dark'
                  ? 'Dark Midnight theme active'
                  : 'Light Cool-Grey theme active'}
              </Text>
            </View>
          </View>

          {/* Theme selector chips */}
          <View style={styles.themeChipsRow}>
            {(['light', 'dark', 'system'] as const).map((mode) => {
              const isSelected = appearance === mode;
              const label =
                mode === 'light' ? 'Light' : mode === 'dark' ? 'Dark' : 'System';
              const iconName =
                mode === 'light'
                  ? 'sunny-outline'
                  : mode === 'dark'
                  ? 'moon-outline'
                  : 'phone-portrait-outline';

              return (
                <TouchableOpacity
                  key={mode}
                  style={[styles.themeChip, isSelected && styles.themeChipSelected]}
                  onPress={() => setAppearance(mode)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={iconName}
                    size={15}
                    color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.themeChipText,
                      isSelected && styles.themeChipTextSelected,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.divider} />

          {/* Notifications Preference */}
          <View style={styles.rowItem}>
            <View style={[styles.iconBadge, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="notifications-outline" size={20} color="#D97706" />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Notifications & Reminders</Text>
              <Text style={styles.rowSubtitle}>Daily expense logging prompt</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
            />
          </View>
        </View>

        {/* GROUP 2: SECURITY */}
        <Text style={styles.groupHeader}>Security</Text>
        <View style={[styles.cardGroup, theme.shadows.soft]}>
          {/* Change Password */}
          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={() => setChangePasswordModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Change Password"
          >
            <View style={[styles.iconBadge, { backgroundColor: isDark ? '#2E1065' : '#EDE9FE' }]}>
              <Ionicons name="key-outline" size={20} color="#7C3AED" />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Change Password</Text>
              <Text style={styles.rowSubtitle}>Update your sign-in password</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={isDark ? '#64748B' : theme.colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Session Security */}
          <View style={styles.rowItem}>
            <View style={[styles.iconBadge, { backgroundColor: isDark ? '#064E3B' : '#D1FAE5' }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#059669" />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Session Security</Text>
              <Text style={styles.rowSubtitle}>24h encrypted JWT bearer session</Text>
            </View>
            <View style={styles.secureBadge}>
              <Text style={styles.secureBadgeText}>Active</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Storage Security */}
          <View style={styles.rowItem}>
            <View style={[styles.iconBadge, { backgroundColor: isDark ? '#082F49' : '#E0F2FE' }]}>
              <Ionicons name="lock-closed-outline" size={20} color="#0284C7" />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Key Storage</Text>
              <Text style={styles.rowSubtitle}>
                {Platform.OS === 'web' ? 'Encrypted Browser Storage' : 'Hardware SecureStore'}
              </Text>
            </View>
          </View>
        </View>

        {/* GROUP 3: DATA & PRIVACY */}
        <Text style={styles.groupHeader}>Data & Privacy</Text>
        <View style={[styles.cardGroup, theme.shadows.soft]}>
          {/* Export Transactions */}
          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={handleExport}
            disabled={isExporting}
            accessibilityRole="button"
            accessibilityLabel="Export my transactions to CSV"
          >
            <View style={[styles.iconBadge, { backgroundColor: isDark ? '#064E3B' : '#DCFCE7' }]}>
              {isExporting ? (
                <ActivityIndicator size="small" color="#16A34A" />
              ) : (
                <Ionicons name="download-outline" size={20} color="#16A34A" />
              )}
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Export My Transactions</Text>
              <Text style={styles.rowSubtitle}>Download full history as CSV</Text>
            </View>
            <View style={styles.exportActionBadge}>
              <Text style={styles.exportActionText}>
                {isExporting ? 'Exporting...' : 'CSV'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Export notice or error */}
          {exportNotice ? (
            <View style={styles.exportNoticeBox}>
              <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
              <Text style={styles.exportNoticeText}>{exportNotice}</Text>
            </View>
          ) : null}

          {exportError ? (
            <View style={styles.exportErrorBox}>
              <Ionicons name="alert-circle" size={16} color={theme.colors.error} />
              <Text style={styles.exportErrorText}>{exportError}</Text>
            </View>
          ) : null}

          <View style={styles.divider} />

          {/* Privacy Information */}
          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={() => setPrivacyModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Privacy policy and data handling explanation"
          >
            <View style={[styles.iconBadge, { backgroundColor: isDark ? '#3B0764' : '#F3E8FF' }]}>
              <Ionicons name="document-text-outline" size={20} color="#9333EA" />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Data & Privacy Policy</Text>
              <Text style={styles.rowSubtitle}>Read our data protection practices</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={isDark ? '#64748B' : theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* GROUP 4: ACCOUNT ACTIONS */}
        <Text style={styles.groupHeader}>Account Actions</Text>
        <View style={[styles.cardGroup, theme.shadows.soft]}>
          {/* About & Version */}
          <View style={styles.rowItem}>
            <View style={[styles.iconBadge, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
              <Ionicons name="information-circle-outline" size={20} color={isDark ? '#94A3B8' : '#64748B'} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>About Expense Tracker</Text>
              <Text style={styles.rowSubtitle}>Phase 6 Production Build</Text>
            </View>
            <Text style={styles.versionBadge}>v1.0.0</Text>
          </View>

          <View style={styles.divider} />

          {/* Log Out */}
          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={handleLogout}
            accessibilityRole="button"
            accessibilityLabel="Log out of account"
          >
            <View style={[styles.iconBadge, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2' }]}>
              <Ionicons name="log-out-outline" size={20} color={isDark ? '#F87171' : theme.colors.error} />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowTitle, isDark && { color: '#F87171' }]}>Log Out</Text>
              <Text style={styles.rowSubtitle}>Clear session and sign out</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={isDark ? '#64748B' : theme.colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Delete Account */}
          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={() => setDeleteAccountModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Delete account and erase all data"
          >
            <View style={[styles.iconBadge, { backgroundColor: theme.colors.errorLight }]}>
              <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowTitle, { color: theme.colors.error }]}>Delete Account</Text>
              <Text style={styles.rowSubtitle}>Permanently erase account and data</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.error} />
          </TouchableOpacity>
        </View>

        {/* Footer info */}
        <Text style={styles.footerNote}>
          Expense Tracker • Built with React Native & Expo SDK 57
        </Text>
      </ScrollView>

      {/* Modals */}
      <CurrencyPickerModal
        visible={currencyModalVisible}
        onClose={() => setCurrencyModalVisible(false)}
      />

      <ChangePasswordModal
        visible={changePasswordModalVisible}
        onClose={() => setChangePasswordModalVisible(false)}
      />

      <DeleteAccountModal
        visible={deleteAccountModalVisible}
        onClose={() => setDeleteAccountModalVisible(false)}
      />

      <DataPrivacyModal
        visible={privacyModalVisible}
        onClose={() => setPrivacyModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    ...theme.typography.title,
    fontSize: 18,
    color: theme.colors.textPrimary,
  },
  placeholder: {
    width: 32,
  },
  container: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: 40,
  },
  groupHeader: {
    ...theme.typography.caption,
    textTransform: 'uppercase',
    color: theme.colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: theme.spacing.sm,
    marginLeft: theme.spacing.xs,
    marginTop: theme.spacing.md,
  },
  cardGroup: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md + 2,
    paddingHorizontal: theme.spacing.lg,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
  rowSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  rowTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  currencyCodeBadge: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  themeChipsRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  themeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  themeChipSelected: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  themeChipText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  themeChipTextSelected: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  secureBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  secureBadgeText: {
    ...theme.typography.caption,
    color: '#065F46',
    fontWeight: '700',
    fontSize: 11,
  },
  exportActionBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  exportActionText: {
    ...theme.typography.caption,
    color: '#15803D',
    fontWeight: '700',
    fontSize: 11,
  },
  exportNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#BBF7D0',
  },
  exportNoticeText: {
    ...theme.typography.caption,
    color: '#166534',
    fontSize: 12,
  },
  exportErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#FECACA',
  },
  exportErrorText: {
    ...theme.typography.caption,
    color: '#991B1B',
    fontSize: 12,
  },
  versionBadge: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.surfaceSubtle,
    marginLeft: 66,
  },
  footerNote: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
    fontSize: 11,
  },
});
