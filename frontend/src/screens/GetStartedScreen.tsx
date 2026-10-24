import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { PrimaryButton } from '../components/PrimaryButton';
import { FinanceIllustration } from '../components/FinanceIllustration';
import { GetStartedNavigationProp } from '../navigation/types';

export const GetStartedScreen: React.FC = () => {
  const navigation = useNavigation<GetStartedNavigationProp>();

  const benefits = [
    {
      id: '1',
      icon: 'receipt-outline' as const,
      title: 'Track income and expenses',
      description: 'Easily log and categorize every dollar coming in or going out.',
    },
    {
      id: '2',
      icon: 'pie-chart-outline' as const,
      title: 'Understand spending patterns',
      description: 'See where your money goes with visual monthly breakdowns.',
    },
    {
      id: '3',
      icon: 'trending-up-outline' as const,
      title: 'Make smarter financial decisions',
      description: 'Stay on budget, reduce waste, and reach your savings goals faster.',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top App Logo & Name */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Ionicons name="wallet" size={20} color={theme.colors.primary} />
            <Text style={styles.logoText}>Expense Tracker</Text>
          </View>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.headline}>Take control of your money.</Text>
          <Text style={styles.supportingText}>
            Track expenses effortlessly, understand your cash flow, and manage your finances with confidence.
          </Text>
        </View>

        {/* Finance Illustration */}
        <FinanceIllustration />

        {/* 3 Core Benefits */}
        <View style={styles.benefitsSection}>
          {benefits.map((benefit) => (
            <View key={benefit.id} style={styles.benefitItem}>
              <View style={styles.benefitIconContainer}>
                <Ionicons name={benefit.icon} size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.benefitTextContainer}>
                <Text style={styles.benefitTitle}>{benefit.title}</Text>
                <Text style={styles.benefitDescription}>{benefit.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <PrimaryButton
            title="Get Started"
            onPress={() => navigation.navigate('Register')}
            variant="primary"
            style={styles.primaryCta}
          />

          <PrimaryButton
            title="I already have an account — Log In"
            onPress={() => navigation.navigate('Login')}
            variant="ghost"
            style={styles.secondaryCta}
          />

          {/* Privacy & Security Reassurance */}
          <View style={styles.securityBadge}>
            <Ionicons name="shield-checkmark" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.securityText}>
              Bank-grade 256-bit encryption • Your data is always private
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  logoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs + 2,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.soft,
  },
  logoText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 13,
    marginLeft: theme.spacing.xs + 2,
  },
  heroSection: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  headline: {
    ...theme.typography.hero,
    fontSize: 30,
    color: theme.colors.textPrimary,
    lineHeight: 38,
  },
  supportingText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    lineHeight: 22,
  },
  benefitsSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.xl,
    ...theme.shadows.soft,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  benefitIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
    marginTop: 2,
  },
  benefitTextContainer: {
    flex: 1,
  },
  benefitTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  benefitDescription: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  actionsSection: {
    marginTop: theme.spacing.sm,
  },
  primaryCta: {
    marginBottom: theme.spacing.sm,
  },
  secondaryCta: {
    marginBottom: theme.spacing.md,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  securityText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginLeft: theme.spacing.xs,
    textAlign: 'center',
  },
});
