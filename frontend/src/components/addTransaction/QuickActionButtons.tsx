import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

export const QuickActionButtons: React.FC = () => {
  const handleScanSMS = () => {
    Alert.alert(
      'Scan SMS (Unavailable)',
      'Automated SMS bank transaction parsing will be available in Phase 5 with device permissions.',
      [{ text: 'Understood' }]
    );
  };

  const handleVoiceEntry = () => {
    Alert.alert(
      'Voice Entry (Unavailable)',
      'Voice expense dictation and natural language processing is scheduled for Phase 5.',
      [{ text: 'Understood' }]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Smart Helpers</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleScanSMS}
          activeOpacity={0.7}
        >
          <View style={[styles.iconBox, { backgroundColor: '#EEF2FF' }]}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={18}
              color={theme.colors.primary}
            />
          </View>
          <View style={styles.textCol}>
            <Text style={styles.btnTitle}>Scan SMS</Text>
            <Text style={styles.btnStatus}>Phase 5</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleVoiceEntry}
          activeOpacity={0.7}
        >
          <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="mic-outline" size={18} color="#D97706" />
          </View>
          <View style={styles.textCol}>
            <Text style={styles.btnTitle}>Voice Entry</Text>
            <Text style={styles.btnStatus}>Phase 5</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    marginBottom: theme.spacing.xs + 2,
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  textCol: {
    flex: 1,
  },
  btnTitle: {
    ...theme.typography.caption,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  btnStatus: {
    ...theme.typography.caption,
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
});
