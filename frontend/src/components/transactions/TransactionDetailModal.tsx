import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { formatINR, formatTransactionDate } from '../../utils/formatters';
import { TransactionItem } from '../../services/dashboardService';
import { transactionService } from '../../services/transactionService';

interface TransactionDetailModalProps {
  visible: boolean;
  transaction: TransactionItem | null;
  token: string | null;
  onClose: () => void;
  onDeleted?: () => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  visible,
  transaction,
  token,
  onClose,
  onDeleted,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!transaction) return null;

  const isIncome = transaction.type === 'INCOME';

  const handleDelete = () => {
    Alert.alert(
      'Delete Transaction',
      `Are you sure you want to delete "${transaction.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!token) return;
            setIsDeleting(true);
            try {
              await transactionService.deleteTransaction(token, transaction.id);
              onClose();
              onDeleted?.();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete transaction.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.card, theme.shadows.medium]}>
          {/* Close button */}
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          {/* Icon Circle */}
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: isIncome ? '#D1FAE5' : '#FEE2E2' },
            ]}
          >
            <Ionicons
              name={isIncome ? 'arrow-down' : 'arrow-up'}
              size={28}
              color={isIncome ? '#059669' : '#DC2626'}
            />
          </View>

          {/* Amount */}
          <Text
            style={[
              styles.amountText,
              { color: isIncome ? '#059669' : '#DC2626' },
            ]}
          >
            {isIncome ? '+' : '-'} {formatINR(transaction.amount)}
          </Text>

          {/* Title */}
          <Text style={styles.titleText}>{transaction.title}</Text>

          {/* Details Table */}
          <View style={styles.detailsBox}>
            <View style={styles.row}>
              <Text style={styles.label}>Type</Text>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: isIncome ? '#D1FAE5' : '#FEE2E2' },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: isIncome ? '#047857' : '#B91C1C' },
                  ]}
                >
                  {transaction.type}
                </Text>
              </View>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Category</Text>
              <Text style={styles.value}>
                {transaction.category || 'Uncategorized'}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Date & Time</Text>
              <Text style={styles.value}>
                {formatTransactionDate(transaction.date)}
              </Text>
            </View>

            {transaction.description ? (
              <View style={styles.row}>
                <Text style={styles.label}>Notes</Text>
                <Text style={styles.value}>{transaction.description}</Text>
              </View>
            ) : null}

            <View style={[styles.row, { borderBottomWidth: 0 }]}>
              <Text style={styles.label}>Transaction ID</Text>
              <Text style={[styles.value, styles.idValue]} numberOfLines={1}>
                {transaction.id}
              </Text>
            </View>
          </View>

          {/* Delete Action */}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            disabled={isDeleting}
            activeOpacity={0.7}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={16} color="#DC2626" />
                <Text style={styles.deleteText}>Delete Transaction</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 6,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  amountText: {
    ...theme.typography.title,
    fontSize: 26,
    fontWeight: '800',
  },
  titleText: {
    ...theme.typography.bodyBold,
    fontSize: 16,
    color: theme.colors.textPrimary,
    marginTop: 4,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  detailsBox: {
    width: '100%',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  value: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    maxWidth: '65%',
    textAlign: 'right',
  },
  idValue: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  badge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  deleteText: {
    ...theme.typography.caption,
    color: '#DC2626',
    fontWeight: '700',
    marginLeft: 6,
  },
});
