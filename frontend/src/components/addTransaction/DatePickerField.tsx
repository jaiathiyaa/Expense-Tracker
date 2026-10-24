import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

interface DatePickerFieldProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  error?: string;
  disabled?: boolean;
}

export const DatePickerField: React.FC<DatePickerFieldProps> = ({
  selectedDate,
  onSelectDate,
  error,
  disabled = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  // Temporary viewing date for the calendar navigation
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth()); // 0-indexed
  const [tempDate, setTempDate] = useState<Date>(selectedDate);

  const openPicker = () => {
    if (disabled) return;
    setTempDate(new Date(selectedDate));
    setViewYear(selectedDate.getFullYear());
    setViewMonth(selectedDate.getMonth());
    setModalVisible(true);
  };

  const handleCancel = () => {
    setModalVisible(false);
  };

  const handleConfirm = () => {
    onSelectDate(tempDate);
    setModalVisible(false);
  };

  const handleQuickSelect = (daysAgo: number) => {
    const target = new Date();
    target.setDate(target.getDate() - daysAgo);
    setTempDate(target);
    setViewYear(target.getFullYear());
    setViewMonth(target.getMonth());
  };

  // Format readable label for the main input field
  const getReadableDateString = (date: Date) => {
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    const dateOptions: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    };
    const formatted = date.toLocaleDateString('en-IN', dateOptions);

    if (isToday) return `Today (${formatted})`;
    if (isYesterday) return `Yesterday (${formatted})`;
    return formatted;
  };

  // Calendar calculations
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const selectDay = (dayNum: number) => {
    const newDate = new Date(viewYear, viewMonth, dayNum, 12, 0, 0);
    setTempDate(newDate);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Date</Text>

      <TouchableOpacity
        style={[
          styles.fieldButton,
          error ? styles.fieldButtonError : null,
          disabled && styles.fieldDisabled,
        ]}
        onPress={openPicker}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Selected date: ${getReadableDateString(selectedDate)}. Tap to change.`}
      >
        <View style={styles.fieldLeft}>
          <View style={styles.iconBox}>
            <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
          </View>
          <Text style={styles.fieldText}>
            {getReadableDateString(selectedDate)}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      {error ? (
        <Text style={styles.errorText} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      {/* Date Picker Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={handleCancel}
          />

          <View style={styles.modalSheet}>
            <View style={styles.grabber} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity
                onPress={handleCancel}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Quick Select Presets */}
            <View style={styles.presetRow}>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => handleQuickSelect(0)}
                activeOpacity={0.7}
              >
                <Text style={styles.presetChipText}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => handleQuickSelect(1)}
                activeOpacity={0.7}
              >
                <Text style={styles.presetChipText}>Yesterday</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => handleQuickSelect(2)}
                activeOpacity={0.7}
              >
                <Text style={styles.presetChipText}>2 Days Ago</Text>
              </TouchableOpacity>
            </View>

            {/* Calendar Controls */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity
                onPress={handlePrevMonth}
                style={styles.navButton}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.monthTitle}>
                {monthNames[viewMonth]} {viewYear}
              </Text>
              <TouchableOpacity
                onPress={handleNextMonth}
                style={styles.navButton}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Days of Week Header */}
            <View style={styles.weekHeader}>
              {daysOfWeek.map((day) => (
                <Text key={day} style={styles.weekDayText}>
                  {day}
                </Text>
              ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.daysGrid}>
              {/* Empty leading offset days */}
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.dayCell} />
              ))}

              {/* Month days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const isSelected =
                  tempDate.getDate() === dayNum &&
                  tempDate.getMonth() === viewMonth &&
                  tempDate.getFullYear() === viewYear;

                const today = new Date();
                const isToday =
                  today.getDate() === dayNum &&
                  today.getMonth() === viewMonth &&
                  today.getFullYear() === viewYear;

                return (
                  <TouchableOpacity
                    key={`day-${dayNum}`}
                    style={[
                      styles.dayCell,
                      isSelected && styles.dayCellSelected,
                      isToday && !isSelected && styles.dayCellToday,
                    ]}
                    onPress={() => selectDay(dayNum)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isSelected && styles.dayTextSelected,
                        isToday && !isSelected && styles.dayTextToday,
                      ]}
                    >
                      {dayNum}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Modal Actions */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirm}
                activeOpacity={0.85}
              >
                <Text style={styles.confirmButtonText}>Confirm Date</Text>
              </TouchableOpacity>
            </View>
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
  fieldButton: {
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
  fieldButtonError: {
    borderColor: theme.colors.error,
    backgroundColor: '#FFF8F8',
  },
  fieldDisabled: {
    opacity: 0.6,
  },
  fieldLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  fieldText: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
    fontSize: 14,
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
  modalSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xxl,
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
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    ...theme.typography.title,
    color: theme.colors.textPrimary,
    fontSize: 19,
  },
  closeBtn: {
    padding: 4,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  presetChip: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
  },
  presetChipText: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
  },
  navButton: {
    padding: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  monthTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weekDayText: {
    width: '14.28%',
    textAlign: 'center',
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontWeight: '700',
    fontSize: 12,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.lg,
  },
  dayCell: {
    width: '14.28%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
    borderRadius: 20,
  },
  dayCellSelected: {
    backgroundColor: theme.colors.primary,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  dayText: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dayTextToday: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
  },
  cancelButtonText: {
    ...theme.typography.button,
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  confirmButton: {
    flex: 2,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.button,
  },
  confirmButtonText: {
    ...theme.typography.button,
    color: '#FFFFFF',
    fontSize: 14,
  },
});
