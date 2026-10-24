import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { getTimeOfDayGreeting } from '../../utils/formatters';

interface DashboardHeaderProps {
  userName?: string;
  onProfilePress?: () => void;
  onAssistantPress?: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  userName = 'Friend',
  onProfilePress,
  onAssistantPress,
}) => {
  const { greeting, emoji } = getTimeOfDayGreeting();

  const handleAssistant = () => {
    if (onAssistantPress) {
      onAssistantPress();
    } else {
      Alert.alert(
        'AI Financial Assistant',
        'AI-powered spending insights and auto-categorization are scheduled for an upcoming phase.',
        [{ text: 'Got it' }]
      );
    }
  };

  const initial = userName ? userName.charAt(0).toUpperCase() : 'U';

  return (
    <View style={styles.container}>
      <View style={styles.greetingSection}>
        <View style={styles.greetingRow}>
          <Text style={styles.greetingText}>{greeting}</Text>
          <Text style={styles.emojiText}> {emoji}</Text>
        </View>
        <Text style={styles.userNameText} numberOfLines={1}>
          {userName}
        </Text>
      </View>

      <View style={styles.actionsRow}>
        {/* AI Assistant Button */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={handleAssistant}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Open AI Assistant"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="sparkles" size={18} color={theme.colors.primary} />
        </TouchableOpacity>

        {/* Profile Avatar Button */}
        <TouchableOpacity
          style={styles.avatarButton}
          onPress={onProfilePress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Open Profile"
        >
          <Text style={styles.avatarLetter}>{initial}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  greetingSection: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greetingText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
  emojiText: {
    fontSize: 14,
  },
  userNameText: {
    ...theme.typography.title,
    color: theme.colors.textPrimary,
    fontSize: 22,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
    ...theme.shadows.soft,
  },
  avatarButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.soft,
  },
  avatarLetter: {
    ...theme.typography.subtitle,
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: '700',
  },
});
