import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';
import { useSettings } from '../context/SettingsContext';

interface SmartFeatureCard {
  id: string;
  title: string;
  description: string;
  icon: any;
  iconColor: string;
  iconBg: string;
  statusBadge: string;
  statusColor: string;
  statusBg: string;
  actionLabel: string;
  onPress: () => void;
}

export const SmartFeaturesScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isDark } = useSettings();

  const features: SmartFeatureCard[] = [
    {
      id: 'sms_import',
      title: 'SMS Transaction Import',
      description:
        'Detect, parse, and review transaction alerts from HDFC, SBI, ICICI, Axis, Paytm, and UPI without manual typing.',
      icon: 'chatbubble-ellipses-outline',
      iconColor: theme.colors.primary,
      iconBg: isDark ? '#1E1B4B' : theme.colors.primaryLight,
      statusBadge: 'Ready to Use',
      statusColor: '#10B981',
      statusBg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5',
      actionLabel: 'Launch SMS Import',
      onPress: () => navigation.navigate('SmsImport'),
    },
    {
      id: 'voice_entry',
      title: 'Voice-Based Expense Entry',
      description:
        'Speak naturally to log expenses (e.g. "Spent ₹250 on lunch today"). Automatically classifies amounts & categories.',
      icon: 'mic-outline',
      iconColor: '#7C3AED',
      iconBg: isDark ? '#2E1065' : '#EDE9FE',
      statusBadge: 'Ready to Use',
      statusColor: '#10B981',
      statusBg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5',
      actionLabel: 'Launch Voice Entry',
      onPress: () => navigation.navigate('VoiceEntry'),
    },
    {
      id: 'offline_mode',
      title: 'Offline-First & Auto Sync',
      description:
        'Log transactions anytime without active network. Automatically syncs with server idempotency when online.',
      icon: 'cloud-offline-outline',
      iconColor: '#2563EB',
      iconBg: isDark ? '#1E3A8A' : '#DBEAFE',
      statusBadge: 'Phase 7C',
      statusColor: '#3B82F6',
      statusBg: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
      actionLabel: 'Offline Sync Details',
      onPress: () =>
        Alert.alert(
          'Offline Mode (Phase 7C)',
          'Client-side persistent queue and bidirectional background sync are queued as Phase 7C.'
        ),
    },
    {
      id: 'ai_assistant',
      title: 'AI Expense Assistant',
      description:
        'Ask questions in conversational chat regarding your spending, monthly budget trends, and category comparisons.',
      icon: 'sparkles-outline',
      iconColor: '#D97706',
      iconBg: isDark ? '#451A03' : '#FEF3C7',
      statusBadge: 'Ready to Use',
      statusColor: '#10B981',
      statusBg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5',
      actionLabel: 'Chat with AI Assistant',
      onPress: () => navigation.navigate('AiAssistant'),
    },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, isDark && styles.safeAreaDark]} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={[styles.topHeader, isDark && styles.topHeaderDark]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, isDark && styles.backButtonDark]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={isDark ? '#F8FAFC' : theme.colors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.textLight]}>Smart Features</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner Hero */}
        <View style={[styles.heroBanner, isDark && styles.heroBannerDark, theme.shadows.medium]}>
          <View style={styles.heroGlow} />
          <View style={styles.heroContent}>
            <View style={styles.heroBadge}>
              <Ionicons name="sparkles" size={14} color="#FFFFFF" />
              <Text style={styles.heroBadgeText}>Next-Gen Finance Tools</Text>
            </View>
            <Text style={styles.heroTitle}>AI & Automated Finance</Text>
            <Text style={styles.heroSubtitle}>
              Streamline expense tracking with intelligent SMS import, natural speech logging, offline resilience, and AI analytics.
            </Text>
          </View>
        </View>

        {/* Feature Cards List */}
        <Text style={[styles.sectionHeader, isDark && styles.textMutedDark]}>
          Available & Upcoming Modules
        </Text>

        {features.map((feat) => (
          <View
            key={feat.id}
            style={[styles.featureCard, isDark && styles.featureCardDark, theme.shadows.soft]}
          >
            <View style={styles.cardTopRow}>
              <View style={[styles.iconBadge, { backgroundColor: feat.iconBg }]}>
                <Ionicons name={feat.icon} size={22} color={feat.iconColor} />
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: feat.statusBg },
                ]}
              >
                <Text style={[styles.statusBadgeText, { color: feat.statusColor }]}>
                  {feat.statusBadge}
                </Text>
              </View>
            </View>

            <Text style={[styles.cardTitle, isDark && styles.textLight]}>{feat.title}</Text>
            <Text style={[styles.cardDescription, isDark && styles.textMutedDark]}>
              {feat.description}
            </Text>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                feat.id === 'sms_import' || feat.id === 'voice_entry'
                  ? styles.actionBtnPrimary
                  : isDark
                  ? styles.actionBtnSecondaryDark
                  : styles.actionBtnSecondary,
              ]}
              onPress={feat.onPress}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={feat.actionLabel}
            >
              <Text
                style={[
                  styles.actionBtnText,
                  feat.id === 'sms_import' || feat.id === 'voice_entry'
                    ? styles.actionBtnTextPrimary
                    : isDark
                    ? styles.textLight
                    : { color: theme.colors.textPrimary },
                ]}
              >
                {feat.actionLabel}
              </Text>
              <Ionicons
                name="arrow-forward"
                size={16}
                color={
                  feat.id === 'sms_import' || feat.id === 'voice_entry'
                    ? '#FFFFFF'
                    : isDark
                    ? '#F8FAFC'
                    : theme.colors.textPrimary
                }
              />
            </TouchableOpacity>
          </View>
        ))}

        <Text style={[styles.footerNote, isDark && styles.textMutedDark]}>
          Phase 7 Smart Features • Local & Private Data Processing
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  safeAreaDark: {
    backgroundColor: '#0B0F19',
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
  topHeaderDark: {
    backgroundColor: '#151C2C',
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  backButtonDark: {
    backgroundColor: '#1E293B',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  headerTitle: {
    ...theme.typography.title,
    fontSize: 18,
    color: theme.colors.textPrimary,
  },
  placeholder: {
    width: 40,
  },
  container: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: 40,
  },
  heroBanner: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  heroBannerDark: {
    backgroundColor: '#3730A3',
  },
  heroGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  heroContent: {
    position: 'relative',
    zIndex: 1,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.full,
    marginBottom: theme.spacing.sm,
  },
  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  heroTitle: {
    ...theme.typography.hero,
    fontSize: 22,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  heroSubtitle: {
    ...theme.typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    lineHeight: 19,
  },
  sectionHeader: {
    ...theme.typography.caption,
    textTransform: 'uppercase',
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: theme.spacing.md,
    marginLeft: 4,
  },
  featureCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  featureCardDark: {
    backgroundColor: '#151C2C',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.full,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cardTitle: {
    ...theme.typography.title,
    fontSize: 17,
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  cardDescription: {
    ...theme.typography.body,
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 19,
    marginBottom: theme.spacing.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.lg,
  },
  actionBtnPrimary: {
    backgroundColor: theme.colors.primary,
  },
  actionBtnSecondary: {
    backgroundColor: '#F1F5F9',
  },
  actionBtnSecondaryDark: {
    backgroundColor: '#1E293B',
  },
  actionBtnText: {
    ...theme.typography.button,
    fontSize: 14,
  },
  actionBtnTextPrimary: {
    color: '#FFFFFF',
  },
  footerNote: {
    textAlign: 'center',
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
  },
  textLight: {
    color: '#F8FAFC',
  },
  textMutedDark: {
    color: '#94A3B8',
  },
});
