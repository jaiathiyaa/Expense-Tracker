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
import { SUPPORTED_CURRENCIES } from '../../utils/formatters';
import { useSettings } from '../../context/SettingsContext';

interface CurrencyPickerModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CurrencyPickerModal: React.FC<CurrencyPickerModalProps> = ({
  visible,
  onClose,
}) => {
  const { currency, setCurrency } = useSettings();

  const handleSelect = async (code: string) => {
    await setCurrency(code);
    onClose();
  };

  const currencyList = Object.values(SUPPORTED_CURRENCIES);

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
            <View>
              <Text style={styles.title}>Select Currency</Text>
              <Text style={styles.subtitle}>Choose your display currency</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close currency picker"
            >
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Important Information Notice */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.infoText}>
              Changing your display currency updates the symbol and formatting across all
              screens. Stored transaction numerical values remain unchanged.
            </Text>
          </View>

          {/* Currency options list */}
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {currencyList.map((item) => {
              const isSelected = item.code === currency;

              return (
                <TouchableOpacity
                  key={item.code}
                  style={[styles.itemRow, isSelected && styles.itemRowActive]}
                  onPress={() => handleSelect(item.code)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <View style={styles.symbolBadge}>
                    <Text
                      style={[
                        styles.symbolText,
                        isSelected && { color: theme.colors.primary },
                      ]}
                    >
                      {item.symbol}
                    </Text>
                  </View>

                  <View style={styles.itemInfo}>
                    <Text
                      style={[
                        styles.itemName,
                        isSelected && { color: theme.colors.primary, fontWeight: '700' },
                      ]}
                    >
                      {item.name}
                    </Text>
                    <Text style={styles.itemCode}>{item.code}</Text>
                  </View>

                  {isSelected ? (
                    <View style={styles.checkCircle}>
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
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
    maxWidth: 440,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
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
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
    alignItems: 'flex-start',
  },
  infoText: {
    ...theme.typography.caption,
    color: theme.colors.primaryDark,
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  list: {
    marginTop: theme.spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceSubtle,
  },
  itemRowActive: {
    backgroundColor: theme.colors.primaryLight,
  },
  symbolBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  symbolText: {
    ...theme.typography.subtitle,
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  itemCode: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
