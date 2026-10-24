import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
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
import { PrimaryButton } from '../components/PrimaryButton';
import { EditProfileModal } from '../components/profile/EditProfileModal';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, logout, checkSession } = useAuth();
  const { currencyInfo, isDark } = useSettings();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await checkSession(false);
    } finally {
      setIsRefreshing(false);
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

  const getInitials = (name?: string): string => {
    if (!name || !name.trim()) return 'U';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  const formatMemberDate = (dateStr?: string): string => {
    if (!dateStr) return 'Active Member';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Active Member';
      return date.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return 'Active Member';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header with Settings shortcut */}
      <View style={styles.topHeader}>
        <Text style={styles.headerTitle}>Account & Profile</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          style={styles.settingsIconBtn}
          accessibilityRole="button"
          accessibilityLabel="Open Settings"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="settings-outline"
            size={22}
            color={isDark ? '#F8FAFC' : theme.colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Profile Card Hero */}
        <View style={[styles.profileHeroCard, theme.shadows.soft]}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{getInitials(user?.name)}</Text>
            <View style={styles.onlineBadge} />
          </View>

          <Text style={styles.userName}>{user?.name || 'Valued User'}</Text>
          <Text style={styles.userEmail}>{user?.email || '—'}</Text>

          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={() => setEditModalVisible(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Edit profile name and email"
          >
            <Ionicons name="create-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.editProfileBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Account Details Group */}
        <Text style={styles.sectionTitle}>Account Information</Text>
        <View style={[styles.detailsCard, theme.shadows.soft]}>
          <View style={styles.detailRow}>
            <View style={styles.detailLeft}>
              <Ionicons name="person-outline" size={18} color={theme.colors.textSecondary} />
              <Text style={styles.detailLabel}>Full Name</Text>
            </View>
            <Text style={styles.detailValue}>{user?.name || '—'}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailLeft}>
              <Ionicons name="mail-outline" size={18} color={theme.colors.textSecondary} />
              <Text style={styles.detailLabel}>Email Address</Text>
            </View>
            <Text style={styles.detailValue}>{user?.email || '—'}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailLeft}>
              <Ionicons name="calendar-outline" size={18} color={theme.colors.textSecondary} />
              <Text style={styles.detailLabel}>Member Since</Text>
            </View>
            <Text style={styles.detailValue}>{formatMemberDate(user?.createdAt)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailLeft}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#10B981" />
              <Text style={styles.detailLabel}>Account Security</Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>Verified Active</Text>
            </View>
          </View>
        </View>

        {/* Quick Settings & Navigation Group */}
        <Text style={styles.sectionTitle}>Preferences & Tools</Text>
        <View style={[styles.detailsCard, theme.shadows.soft]}>
          {/* Smart Features (Phase 7) */}
          <TouchableOpacity
            style={styles.navRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('SmartFeatures')}
            accessibilityRole="button"
            accessibilityLabel="Smart features, SMS import and AI tools"
          >
            <View style={[styles.navIconBadge, { backgroundColor: isDark ? '#1E1B4B' : theme.colors.primaryLight }]}>
              <Ionicons name="sparkles-outline" size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.navContent}>
              <Text style={styles.navTitle}>Smart Features & SMS</Text>
              <Text style={styles.navSubtitle}>SMS Parser, Voice, Offline & AI</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={isDark ? '#64748B' : theme.colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Display Currency */}
          <TouchableOpacity
            style={styles.navRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Settings')}
            accessibilityRole="button"
            accessibilityLabel="Configure currency and preferences"
          >
            <View style={[styles.navIconBadge, { backgroundColor: isDark ? '#1E1B4B' : theme.colors.primaryLight }]}>
              <Ionicons name="cash-outline" size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.navContent}>
              <Text style={styles.navTitle}>Display Currency</Text>
              <Text style={styles.navSubtitle}>{currencyInfo.name}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={isDark ? '#64748B' : theme.colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Security & Password */}
          <TouchableOpacity
            style={styles.navRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Settings')}
            accessibilityRole="button"
            accessibilityLabel="Change password and security"
          >
            <View style={[styles.navIconBadge, { backgroundColor: isDark ? '#2E1065' : '#EDE9FE' }]}>
              <Ionicons name="key-outline" size={18} color="#7C3AED" />
            </View>
            <View style={styles.navContent}>
              <Text style={styles.navTitle}>Security & Password</Text>
              <Text style={styles.navSubtitle}>Update password & session settings</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={isDark ? '#64748B' : theme.colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Export Transactions */}
          <TouchableOpacity
            style={styles.navRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Settings')}
            accessibilityRole="button"
            accessibilityLabel="Export transactions as CSV"
          >
            <View style={[styles.navIconBadge, { backgroundColor: isDark ? '#064E3B' : '#DCFCE7' }]}>
              <Ionicons name="download-outline" size={18} color="#16A34A" />
            </View>
            <View style={styles.navContent}>
              <Text style={styles.navTitle}>Export Transactions</Text>
              <Text style={styles.navSubtitle}>Download your records to CSV</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={isDark ? '#64748B' : theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Log Out Button */}
        <PrimaryButton
          title="Log Out"
          onPress={handleLogout}
          variant="outline"
          icon={<Ionicons name="log-out-outline" size={18} color={isDark ? '#F87171' : theme.colors.textPrimary} />}
          textStyle={isDark ? { color: '#F87171' } : undefined}
          style={[
            styles.logoutButton,
            isDark && {
              backgroundColor: '#151C2C',
              borderColor: 'rgba(239, 68, 68, 0.3)',
            },
          ]}
        />
      </ScrollView>

      {/* Edit Profile Modal */}
      <EditProfileModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
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
  headerTitle: {
    ...theme.typography.title,
    fontSize: 18,
    color: theme.colors.textPrimary,
  },
  settingsIconBtn: {
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  container: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: 110, // safe clearance above bottom navigation bar
  },
  profileHeroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 2.5,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
    position: 'relative',
  },
  avatarInitials: {
    ...theme.typography.hero,
    color: theme.colors.primary,
    fontSize: 28,
    fontWeight: '700',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  userName: {
    ...theme.typography.title,
    fontSize: 20,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  userEmail: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginBottom: theme.spacing.md,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: 'rgba(81, 69, 245, 0.2)',
  },
  editProfileBtnText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  sectionTitle: {
    ...theme.typography.caption,
    textTransform: 'uppercase',
    color: theme.colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: theme.spacing.sm,
    marginLeft: theme.spacing.xs,
  },
  detailsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    marginBottom: theme.spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  detailLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
  detailValue: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    fontSize: 13,
  },
  statusPill: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.sm,
  },
  statusPillText: {
    ...theme.typography.caption,
    color: '#065F46',
    fontWeight: '700',
    fontSize: 11,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  navIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  navContent: {
    flex: 1,
  },
  navTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
    fontSize: 14,
  },
  navSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.surfaceSubtle,
    marginLeft: theme.spacing.lg,
  },
  logoutButton: {
    marginTop: theme.spacing.xs,
  },
});
