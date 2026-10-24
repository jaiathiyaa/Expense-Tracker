import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
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
import { PrimaryButton } from '../components/PrimaryButton';
import {
  parseBatchSms,
  flagDuplicates,
  ParsedSmsTransaction,
} from '../services/smsParserService';
import { transactionService } from '../services/transactionService';
import { EditParsedTransactionModal } from '../components/smart/EditParsedTransactionModal';
import { getCategoryDefinition } from '../utils/categories';

const SAMPLE_TEMPLATES = [
  {
    label: 'HDFC Swiggy (₹450)',
    sms: 'Alert: Rs.450.00 debited from HDFC Bank A/c **1234 on 23-OCT-26 to SWIGGY. Info: UPI/329482. Avl Bal Rs 24,000.',
  },
  {
    label: 'SBI Amazon (₹1,200)',
    sms: 'Dear SBI User, your A/c ending 4321 debited by Rs 1200.00 on 23-Oct-2026 transfer to Amazon. Ref: 239048.',
  },
  {
    label: 'ICICI Dining (₹350)',
    sms: 'Acct XX789 debited for Rs 350.00 on 23-Oct-26. Info: UPI/Zomato/zomato@icici. Available Bal: Rs 15,400.00',
  },
  {
    label: 'Salary Credit (₹45,000)',
    sms: 'Your A/c **1234 is credited with Rs 45,000.00 on 23-OCT-26 by Salary/TRANSFER.',
  },
];

export const SmsImportScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { token } = useAuth();
  const { isDark, currencyInfo } = useSettings();

  const [rawText, setRawText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedSmsTransaction[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<ParsedSmsTransaction | null>(null);

  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);

  // Handle parsing user input or pasted SMS
  const handleParse = async () => {
    if (!rawText.trim()) {
      Alert.alert('Empty Text', 'Please paste one or more bank SMS messages first.');
      return;
    }

    setIsParsing(true);
    try {
      const results = parseBatchSms(rawText);

      if (results.length === 0) {
        Alert.alert(
          'No Transactions Found',
          'Could not detect any valid transaction amounts or debit/credit notices in the provided text.'
        );
        return;
      }

      // Check duplicates against existing user transactions
      let flaggedResults = results;
      if (token) {
        try {
          const existing = await transactionService.getTransactions(token, { limit: 50 });
          flaggedResults = flagDuplicates(results, existing.data);
        } catch (e) {
          console.warn('Could not fetch existing transactions for duplicate check:', e);
        }
      }

      setParsedItems(flaggedResults);

      // Select valid items by default (excluding likely duplicates)
      const validIds = new Set(
        flaggedResults
          .filter((item) => item.isValid && !item.isLikelyDuplicate)
          .map((item) => item.id)
      );
      setSelectedIds(validIds);
    } finally {
      setIsParsing(false);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    const validItems = parsedItems.filter((item) => item.isValid);
    if (selectedIds.size === validItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(validItems.map((item) => item.id)));
    }
  };

  const handleSaveEditedItem = (updated: ParsedSmsTransaction) => {
    setParsedItems((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
    // ensure it is selected if valid
    if (updated.isValid) {
      setSelectedIds((prev) => new Set(prev).add(updated.id));
    }
  };

  const handleRemoveItem = (id: string) => {
    setParsedItems((prev) => prev.filter((item) => item.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Perform import
  const handleImportSelected = async () => {
    if (!token) {
      Alert.alert('Session Expired', 'Please log in again to import transactions.');
      return;
    }

    const itemsToImport = parsedItems.filter(
      (item) => selectedIds.has(item.id) && item.isValid
    );

    if (itemsToImport.length === 0) {
      Alert.alert('No Selection', 'Please select at least one valid transaction to import.');
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: itemsToImport.length });

    let successCount = 0;
    const failedItems: string[] = [];

    for (let i = 0; i < itemsToImport.length; i++) {
      const item = itemsToImport[i];
      setImportProgress({ current: i + 1, total: itemsToImport.length });

      try {
        await transactionService.createTransaction(token, {
          title: item.title,
          amount: item.amount,
          type: item.type,
          category: item.category,
          date: item.date,
          description: `Imported via SMS [${item.accountHint || 'Bank'}] ${item.referenceNumber ? `Ref: ${item.referenceNumber}` : ''}`.trim(),
        });
        successCount++;
      } catch (err: any) {
        console.error(`Failed to import transaction "${item.title}":`, err);
        failedItems.push(item.title);
      }
    }

    setIsImporting(false);
    setImportProgress(null);
    setImportSuccessCount(successCount);

    if (failedItems.length > 0) {
      Alert.alert(
        'Partial Import',
        `Imported ${successCount} transactions. Failed to import: ${failedItems.join(', ')}.`
      );
    }
  };

  const resetAll = () => {
    setRawText('');
    setParsedItems([]);
    setSelectedIds(new Set());
    setImportSuccessCount(null);
  };

  const selectedCount = selectedIds.size;
  const validCount = parsedItems.filter((i) => i.isValid).length;

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
        <Text style={[styles.headerTitle, isDark && styles.textLight]}>SMS Import & Review</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Import Success Banner */}
        {importSuccessCount !== null ? (
          <View style={[styles.successCard, isDark && styles.successCardDark, theme.shadows.soft]}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark" size={28} color="#FFFFFF" />
            </View>
            <Text style={[styles.successTitle, isDark && styles.textLight]}>Import Completed!</Text>
            <Text style={[styles.successSubtitle, isDark && styles.textMutedDark]}>
              Successfully saved {importSuccessCount} transaction{importSuccessCount === 1 ? '' : 's'} to your account.
            </Text>
            <View style={styles.successActions}>
              <TouchableOpacity
                style={[styles.successBtnOutline, isDark && styles.successBtnOutlineDark]}
                onPress={resetAll}
                activeOpacity={0.8}
              >
                <Ionicons name="repeat-outline" size={16} color={theme.colors.primary} />
                <Text style={styles.successBtnOutlineText}>Import More</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.successBtnPrimary, theme.shadows.button]}
                onPress={() => navigation.navigate('MainTabs', { screen: 'Transactions' })}
                activeOpacity={0.8}
              >
                <Text style={styles.successBtnPrimaryText}>View Transactions</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* SECTION 1: SMS Input & Sample Buttons */}
        {parsedItems.length === 0 ? (
          <View style={[styles.card, isDark && styles.cardDark, theme.shadows.soft]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.headerIconBadge, { backgroundColor: isDark ? '#1E1B4B' : theme.colors.primaryLight }]}>
                <Ionicons name="chatbubble-ellipses" size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.headerTextGroup}>
                <Text style={[styles.cardTitle, isDark && styles.textLight]}>Paste Transaction SMS</Text>
                <Text style={[styles.cardSubtitle, isDark && styles.textMutedDark]}>
                  Paste bank SMS alerts to automatically parse expenses & income
                </Text>
              </View>
            </View>

            {/* Textarea */}
            <TextInput
              style={[styles.textInputArea, isDark && styles.textInputAreaDark]}
              multiline
              numberOfLines={5}
              placeholder="Paste your bank or UPI transaction messages here...&#10;Supports HDFC, SBI, ICICI, Axis, Paytm, and more."
              placeholderTextColor={isDark ? '#64748B' : theme.colors.textMuted}
              value={rawText}
              onChangeText={setRawText}
            />

            {/* Sample Templates */}
            <Text style={[styles.samplesLabel, isDark && styles.textMutedDark]}>
              Or tap a sample to test parsing:
            </Text>
            <View style={styles.samplesRow}>
              {SAMPLE_TEMPLATES.map((sample, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.sampleChip, isDark && styles.sampleChipDark]}
                  onPress={() => setRawText(sample.sms)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="flash-outline" size={13} color={theme.colors.primary} />
                  <Text style={[styles.sampleChipText, isDark && styles.sampleChipTextDark]}>
                    {sample.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Parse Action Button */}
            <PrimaryButton
              title={isParsing ? 'Detecting Transactions...' : 'Detect & Review Transactions'}
              onPress={handleParse}
              loading={isParsing}
              disabled={!rawText.trim() || isParsing}
              icon={<Ionicons name="sparkles" size={18} color="#FFFFFF" />}
              style={styles.parseBtn}
            />

            {/* Safe Privacy Disclaimer */}
            <View style={styles.privacyNote}>
              <Ionicons name="shield-checkmark" size={14} color="#10B981" />
              <Text style={[styles.privacyNoteText, isDark && styles.textMutedDark]}>
                Zero-Upload Privacy: All parsing occurs locally on device. Raw SMS messages are never sent to any server.
              </Text>
            </View>
          </View>
        ) : (
          /* SECTION 2: REVIEW PARSED TRANSACTIONS */
          <View>
            <View style={styles.reviewHeaderRow}>
              <View>
                <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
                  Detected Transactions ({parsedItems.length})
                </Text>
                <Text style={[styles.sectionSubtitle, isDark && styles.textMutedDark]}>
                  Review and verify extracted details before importing
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.reparseBtn, isDark && styles.reparseBtnDark]}
                onPress={() => setParsedItems([])}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={14} color={theme.colors.primary} />
                <Text style={styles.reparseBtnText}>Paste New</Text>
              </TouchableOpacity>
            </View>

            {/* Select All Toggle Bar */}
            <View style={[styles.selectionBar, isDark && styles.selectionBarDark]}>
              <TouchableOpacity
                style={styles.selectionBarLeft}
                onPress={toggleSelectAll}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={
                    selectedCount === validCount && validCount > 0
                      ? 'checkbox'
                      : selectedCount > 0
                      ? 'remove-circle-outline'
                      : 'square-outline'
                  }
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={[styles.selectionBarText, isDark && styles.textLight]}>
                  {selectedCount === validCount && validCount > 0
                    ? 'All Selected'
                    : `Select All (${selectedCount}/${validCount})`}
                </Text>
              </TouchableOpacity>

              <Text style={[styles.selectionBarHint, isDark && styles.textMutedDark]}>
                Tap card to edit
              </Text>
            </View>

            {/* List of Parsed Cards */}
            {parsedItems.map((item) => {
              const isSelected = selectedIds.has(item.id);
              const isExpense = item.type === 'EXPENSE';
              const catDef = getCategoryDefinition(item.category, item.type);

              return (
                <View
                  key={item.id}
                  style={[
                    styles.parsedCard,
                    isDark && styles.parsedCardDark,
                    isSelected && styles.parsedCardSelected,
                    theme.shadows.soft,
                  ]}
                >
                  <View style={styles.parsedCardTop}>
                    {/* Checkbox */}
                    <TouchableOpacity
                      onPress={() => toggleSelect(item.id)}
                      disabled={!item.isValid}
                      style={styles.checkboxTouch}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name={isSelected ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={
                          !item.isValid
                            ? '#CBD5E1'
                            : isSelected
                            ? theme.colors.primary
                            : '#94A3B8'
                        }
                      />
                    </TouchableOpacity>

                    {/* Category Icon Badge */}
                    <View
                      style={[
                        styles.catBadge,
                        {
                          backgroundColor: isDark ? '#1E293B' : catDef.bgColor,
                        },
                      ]}
                    >
                      <Ionicons name={catDef.icon} size={18} color={catDef.color} />
                    </View>

                    {/* Title & Account */}
                    <TouchableOpacity
                      style={styles.parsedMainInfo}
                      onPress={() => setEditingItem(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.titleRow}>
                        <Text
                          style={[styles.parsedTitle, isDark && styles.textLight]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        <Ionicons
                          name="pencil-sharp"
                          size={13}
                          color={theme.colors.textMuted}
                          style={{ marginLeft: 4 }}
                        />
                      </View>
                      <View style={styles.subMetaRow}>
                        <Text style={[styles.parsedDate, isDark && styles.textMutedDark]}>
                          {item.date}
                        </Text>
                        {item.accountHint ? (
                          <>
                            <Text style={styles.dotSeparator}>•</Text>
                            <Text style={[styles.accountHintText, isDark && styles.textMutedDark]}>
                              {item.accountHint}
                            </Text>
                          </>
                        ) : null}
                      </View>
                    </TouchableOpacity>

                    {/* Amount & Type Badge */}
                    <View style={styles.amountCol}>
                      <Text
                        style={[
                          styles.parsedAmount,
                          { color: isExpense ? '#EF4444' : '#10B981' },
                        ]}
                      >
                        {isExpense ? '-' : '+'}
                        {currencyInfo.symbol}
                        {item.amount.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </Text>
                      <View
                        style={[
                          styles.typeBadge,
                          {
                            backgroundColor: isExpense
                              ? isDark
                                ? 'rgba(239, 68, 68, 0.15)'
                                : '#FEE2E2'
                              : isDark
                              ? 'rgba(16, 185, 129, 0.15)'
                              : '#D1FAE5',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.typeBadgeText,
                            { color: isExpense ? '#EF4444' : '#10B981' },
                          ]}
                        >
                          {item.type}
                        </Text>
                      </View>
                    </View>

                    {/* Delete action */}
                    <TouchableOpacity
                      onPress={() => handleRemoveItem(item.id)}
                      style={styles.deleteBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel="Remove item"
                    >
                      <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>

                  {/* Warning / Duplicate Banner */}
                  {item.isLikelyDuplicate ? (
                    <View style={styles.duplicateWarning}>
                      <Ionicons name="warning-outline" size={14} color="#D97706" />
                      <Text style={styles.duplicateWarningText}>
                        Likely duplicate: Matches an existing transaction on record.
                      </Text>
                    </View>
                  ) : null}

                  {!item.isValid && item.parseError ? (
                    <View style={styles.errorWarning}>
                      <Ionicons name="alert-circle" size={14} color={theme.colors.error} />
                      <Text style={styles.errorWarningText}>{item.parseError}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom Import Action Bar */}
      {parsedItems.length > 0 && importSuccessCount === null ? (
        <View style={[styles.bottomActionBar, isDark && styles.bottomActionBarDark, theme.shadows.medium]}>
          <View style={styles.bottomBarInfo}>
            <Text style={[styles.bottomBarCount, isDark && styles.textLight]}>
              {selectedCount} selected
            </Text>
            <Text style={[styles.bottomBarSub, isDark && styles.textMutedDark]}>
              Ready for import
            </Text>
          </View>

          <PrimaryButton
            title={
              isImporting
                ? `Importing (${importProgress?.current || 0}/${importProgress?.total || 0})...`
                : `Import (${selectedCount})`
            }
            onPress={handleImportSelected}
            loading={isImporting}
            disabled={selectedCount === 0 || isImporting}
            icon={<Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />}
            style={styles.importBtn}
          />
        </View>
      ) : null}

      {/* Edit Modal */}
      <EditParsedTransactionModal
        visible={editingItem !== null}
        transaction={editingItem}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveEditedItem}
      />
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
    paddingBottom: 110,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  cardDark: {
    backgroundColor: '#151C2C',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  headerIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  headerTextGroup: {
    flex: 1,
  },
  cardTitle: {
    ...theme.typography.title,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  cardSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  textInputArea: {
    backgroundColor: '#F8FAFC',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    fontSize: 14,
    color: theme.colors.textPrimary,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: theme.spacing.md,
  },
  textInputAreaDark: {
    backgroundColor: '#0F172A',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    color: '#F8FAFC',
  },
  samplesLabel: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  samplesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: theme.spacing.lg,
  },
  sampleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#EEF2FF',
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  sampleChipDark: {
    backgroundColor: '#1E1B4B',
    borderColor: '#3730A3',
  },
  sampleChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
    marginLeft: 4,
  },
  sampleChipTextDark: {
    color: '#A5B4FC',
  },
  parseBtn: {
    marginBottom: theme.spacing.md,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  privacyNoteText: {
    fontSize: 11,
    color: '#065F46',
    marginLeft: 6,
    flex: 1,
    lineHeight: 15,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.typography.title,
    fontSize: 17,
    color: theme.colors.textPrimary,
  },
  sectionSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  reparseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#EEF2FF',
  },
  reparseBtnDark: {
    backgroundColor: '#1E1B4B',
  },
  reparseBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
    marginLeft: 4,
  },
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
  },
  selectionBarDark: {
    backgroundColor: '#1E293B',
  },
  selectionBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectionBarText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginLeft: 8,
  },
  selectionBarHint: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  parsedCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm + 4,
  },
  parsedCardDark: {
    backgroundColor: '#151C2C',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  parsedCardSelected: {
    borderColor: theme.colors.primary,
    borderWidth: 1.5,
  },
  parsedCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxTouch: {
    paddingRight: 8,
  },
  catBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  parsedMainInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  parsedTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
    maxWidth: 140,
  },
  subMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  parsedDate: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  dotSeparator: {
    marginHorizontal: 4,
    color: theme.colors.textMuted,
    fontSize: 10,
  },
  accountHintText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  amountCol: {
    alignItems: 'flex-end',
    marginLeft: 8,
    marginRight: 8,
  },
  parsedAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  deleteBtn: {
    padding: 6,
  },
  duplicateWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  duplicateWarningText: {
    fontSize: 11,
    color: '#92400E',
    marginLeft: 6,
    fontWeight: '500',
  },
  errorWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  errorWarningText: {
    fontSize: 11,
    color: theme.colors.error,
    marginLeft: 6,
    fontWeight: '500',
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomActionBarDark: {
    backgroundColor: '#151C2C',
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  bottomBarInfo: {
    flex: 1,
  },
  bottomBarCount: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  bottomBarSub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  importBtn: {
    minHeight: 46,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  successCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#86EFAC',
    marginBottom: theme.spacing.lg,
  },
  successCardDark: {
    backgroundColor: '#151C2C',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  successIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  successTitle: {
    ...theme.typography.title,
    fontSize: 18,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  successSubtitle: {
    ...theme.typography.body,
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  successActions: {
    flexDirection: 'row',
    gap: 12,
  },
  successBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  successBtnOutlineDark: {
    backgroundColor: '#1E1B4B',
    borderColor: '#3730A3',
  },
  successBtnOutlineText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
    marginLeft: 6,
  },
  successBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.primary,
  },
  successBtnPrimaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 6,
  },
  textLight: {
    color: '#F8FAFC',
  },
  textMutedDark: {
    color: '#94A3B8',
  },
});
