import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import {
  CategoryDefinition,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  getCategoryDefinition,
} from '../../utils/categories';

interface CategorySelectorProps {
  selectedCategory: string;
  type: 'EXPENSE' | 'INCOME';
  onSelectCategory: (category: string) => void;
  error?: string;
  disabled?: boolean;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategory,
  type,
  onSelectCategory,
  error,
  disabled = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const categories: CategoryDefinition[] =
    type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const currentDef = getCategoryDefinition(selectedCategory, type);

  const handleSelect = (categoryName: string) => {
    onSelectCategory(categoryName);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Category</Text>

      <TouchableOpacity
        style={[
          styles.selectorButton,
          error ? styles.selectorButtonError : null,
          disabled && styles.selectorDisabled,
        ]}
        onPress={() => !disabled && setModalVisible(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Selected category: ${currentDef.name}. Tap to change.`}
      >
        <View style={styles.selectorLeft}>
          <View style={[styles.iconBox, { backgroundColor: currentDef.bgColor }]}>
            <Ionicons name={currentDef.icon} size={20} color={currentDef.color} />
          </View>
          <Text style={styles.selectedName}>{currentDef.name}</Text>
        </View>

        <View style={styles.dropdownIconBox}>
          <Ionicons
            name="chevron-down"
            size={18}
            color={theme.colors.textSecondary}
          />
        </View>
      </TouchableOpacity>

      {error ? (
        <Text style={styles.errorText} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      {/* Category Bottom Sheet Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />

          <View style={styles.sheetContainer}>
            <View style={styles.grabber} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Category</Text>
                <Text style={styles.modalSubtitle}>
                  Choose a category for this {type.toLowerCase()}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.categoryList}
            >
              {categories.map((cat) => {
                const isSelected =
                  cat.name.toLowerCase() === (selectedCategory || '').toLowerCase();

                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryRow,
                      isSelected && styles.categoryRowSelected,
                    ]}
                    onPress={() => handleSelect(cat.name)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.categoryRowLeft}>
                      <View style={[styles.iconBox, { backgroundColor: cat.bgColor }]}>
                        <Ionicons name={cat.icon} size={20} color={cat.color} />
                      </View>
                      <Text
                        style={[
                          styles.categoryRowText,
                          isSelected && styles.categoryRowTextSelected,
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </View>

                    {isSelected ? (
                      <View style={styles.checkmarkBox}>
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color={theme.colors.primary}
                        />
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    minHeight: 56,
  },
  selectorButtonError: {
    borderColor: theme.colors.error,
    backgroundColor: '#FFF8F8',
  },
  selectorDisabled: {
    opacity: 0.6,
  },
  selectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  selectedName: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
    fontSize: 15,
  },
  dropdownIconBox: {
    paddingLeft: theme.spacing.sm,
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xxxl,
    maxHeight: '78%',
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginBottom: theme.spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    ...theme.typography.title,
    color: theme.colors.textPrimary,
    fontSize: 20,
  },
  modalSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  categoryList: {
    paddingBottom: theme.spacing.xl,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: 6,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryRowSelected: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  categoryRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryRowText: {
    ...theme.typography.body,
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  categoryRowTextSelected: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  checkmarkBox: {
    marginLeft: theme.spacing.sm,
  },
});
