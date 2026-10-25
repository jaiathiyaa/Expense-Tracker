import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
  Animated,
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
import { FormInput } from '../components/FormInput';
import {
  parseVoiceTranscript,
  ParsedVoiceTransaction,
} from '../services/voiceParserService';
import { voiceRecognitionService } from '../services/voiceRecognitionService';
import { transactionService } from '../services/transactionService';
import { offlineTransactionService } from '../services/offlineTransactionService';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, getCategoryDefinition } from '../utils/categories';

const SAMPLE_VOICE_PROMPTS = [
  'I spent 250 rupees on lunch today',
  'Paid 120 for coffee yesterday',
  'I received 5000 rupees salary today',
  'Spent 800 on petrol using UPI',
];

export const VoiceEntryScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { token, user } = useAuth();
  const { isDark, currencyInfo } = useSettings();

  // Voice recording state
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [manualText, setManualText] = useState('');

  // Proposed transaction confirmation state
  const [parsedTx, setParsedTx] = useState<ParsedVoiceTransaction | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editType, setEditType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [editCategory, setEditCategory] = useState('');
  const [editDate, setEditDate] = useState('');

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isOfflineSaved, setIsOfflineSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Animation pulse for listening state
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening]);

  // Clean up recording listener when leaving screen
  useEffect(() => {
    return () => {
      voiceRecognitionService.abortListening();
    };
  }, []);

  const startVoiceRecording = () => {
    setVoiceError(null);
    setTranscript('');
    setIsListening(true);

    voiceRecognitionService.startListening({
      onStart: () => {
        setIsListening(true);
      },
      onInterim: (interim) => {
        setTranscript(interim);
      },
      onFinal: (finalText) => {
        setTranscript(finalText);
        setIsListening(false);
        handleProcessTranscript(finalText);
      },
      onError: (err) => {
        setIsListening(false);
        setVoiceError(err);
      },
      onEnd: () => {
        setIsListening(false);
      },
      onCancel: () => {
        setIsListening(false);
      },
    });
  };

  const stopVoiceRecording = () => {
    voiceRecognitionService.stopListening();
    setIsListening(false);
    if (transcript.trim() && !parsedTx) {
      handleProcessTranscript(transcript);
    }
  };

  const handleProcessTranscript = (text: string) => {
    if (!text.trim()) return;
    const parsed = parseVoiceTranscript(text);
    setParsedTx(parsed);
    setEditTitle(parsed.title);
    setEditAmount(parsed.amount > 0 ? parsed.amount.toString() : '');
    setEditType(parsed.type);
    setEditCategory(parsed.category);
    setEditDate(parsed.date);
    setSaveError(null);
  };

  const handleManualParse = () => {
    if (!manualText.trim()) {
      Alert.alert('Empty Input', 'Please type a transaction sentence first.');
      return;
    }
    setTranscript(manualText.trim());
    handleProcessTranscript(manualText.trim());
  };

  const handleConfirmAndSave = async () => {
    if (isSaving) return;
    if (!token) {
      Alert.alert('Session Expired', 'Please log in again to save this transaction.');
      return;
    }

    if (!editTitle.trim()) {
      setSaveError('Please enter a valid title or merchant.');
      return;
    }

    const numericAmount = parseFloat(editAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setSaveError('Please enter a valid positive amount.');
      return;
    }

    if (!editDate.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(editDate.trim())) {
      setSaveError('Date must be in YYYY-MM-DD format.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const activeUserId = user?.id || '';
      const result = await offlineTransactionService.createTransaction(token, activeUserId, {
        title: editTitle.trim(),
        amount: numericAmount,
        type: editType,
        category: editCategory.trim(),
        date: editDate.trim(),
        description: `Voice Entry: "${transcript.trim()}"`.slice(0, 255),
      });

      setIsOfflineSaved(result.isOffline);
      setSaveSuccess(true);
    } catch (err: any) {
      setSaveError(
        err.message || 'Unable to save transaction. Your entry draft has been preserved so you can retry.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const resetEntry = () => {
    setParsedTx(null);
    setTranscript('');
    setManualText('');
    setSaveSuccess(false);
    setSaveError(null);
    setVoiceError(null);
  };

  const categories = editType === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const isSpeechSupported = voiceRecognitionService.isSupported();

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
        <Text style={[styles.headerTitle, isDark && styles.textLight]}>Voice Expense Entry</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Success Card */}
        {saveSuccess ? (
          <View style={[styles.successCard, isDark && styles.successCardDark, theme.shadows.medium]}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark" size={32} color="#FFFFFF" />
            </View>
            <Text style={[styles.successTitle, isDark && styles.textLight]}>
              {isOfflineSaved ? 'Transaction Queued Offline!' : 'Transaction Saved!'}
            </Text>
            <Text style={[styles.successSub, isDark && styles.textMutedDark]}>
              {isOfflineSaved
                ? `Queued ₹${parseFloat(editAmount).toFixed(2)} for "${editTitle}". Will sync when internet is restored.`
                : `Successfully recorded ₹${parseFloat(editAmount).toFixed(2)} for "${editTitle}".`}
            </Text>

            <View style={styles.successActionRow}>
              <TouchableOpacity
                style={[styles.btnOutline, isDark && styles.btnOutlineDark]}
                onPress={resetEntry}
                activeOpacity={0.8}
              >
                <Ionicons name="mic-outline" size={16} color={theme.colors.primary} />
                <Text style={styles.btnOutlineText}>Speak Another</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnPrimary, theme.shadows.button]}
                onPress={() => navigation.navigate('MainTabs', { screen: 'Transactions' })}
                activeOpacity={0.8}
              >
                <Text style={styles.btnPrimaryText}>View Transactions</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        ) : !parsedTx ? (
          /* SECTION 1: VOICE LISTENER & PROMPT */
          <View>
            <View style={[styles.micCard, isDark && styles.micCardDark, theme.shadows.soft]}>
              <Text style={[styles.cardHeadline, isDark && styles.textLight]}>
                {isListening ? 'Listening...' : 'Tap & Speak'}
              </Text>
              <Text style={[styles.cardSubtitle, isDark && styles.textMutedDark]}>
                {isListening
                  ? 'Speak clearly in natural language...'
                  : 'Say your expense e.g. "Spent 250 on lunch today"'}
              </Text>

              {/* Pulsing Mic Button */}
              <View style={styles.micButtonContainer}>
                {isListening && (
                  <Animated.View
                    style={[
                      styles.listeningRipple,
                      {
                        transform: [{ scale: pulseAnim }],
                      },
                    ]}
                  />
                )}

                <TouchableOpacity
                  style={[
                    styles.micButton,
                    isListening ? styles.micButtonActive : styles.micButtonIdle,
                    theme.shadows.button,
                  ]}
                  onPress={isListening ? stopVoiceRecording : startVoiceRecording}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={isListening ? 'Stop listening' : 'Start speaking transaction'}
                >
                  <Ionicons
                    name={isListening ? 'stop' : 'mic'}
                    size={36}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </View>

              {/* Status Pill */}
              <View
                style={[
                  styles.statusPill,
                  isListening
                    ? styles.statusPillActive
                    : isSpeechSupported
                    ? styles.statusPillIdle
                    : styles.statusPillDisabled,
                  isDark && styles.statusPillDark,
                ]}
              >
                <Ionicons
                  name={
                    isListening
                      ? 'radio-button-on'
                      : isSpeechSupported
                      ? 'mic-circle-outline'
                      : 'information-circle-outline'
                  }
                  size={15}
                  color={
                    isListening
                      ? '#EF4444'
                      : isSpeechSupported
                      ? theme.colors.primary
                      : theme.colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.statusPillText,
                    {
                      color: isListening
                        ? '#EF4444'
                        : isSpeechSupported
                        ? theme.colors.primary
                        : theme.colors.textSecondary,
                    },
                  ]}
                >
                  {isListening
                    ? 'Listening for speech...'
                    : isSpeechSupported
                    ? 'Microphone Ready'
                    : 'Voice Unavailable (Manual Entry Active)'}
                </Text>
              </View>

              {/* Live Transcript Display */}
              {transcript ? (
                <View style={[styles.transcriptBox, isDark && styles.transcriptBoxDark]}>
                  <Text style={[styles.transcriptLabel, isDark && styles.textMutedDark]}>Heard Speech:</Text>
                  <Text style={[styles.transcriptText, isDark && styles.textLight]}>"{transcript}"</Text>
                </View>
              ) : null}

              {/* Voice Error Banner */}
              {voiceError ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color={theme.colors.error} />
                  <Text style={styles.errorText}>{voiceError}</Text>
                </View>
              ) : null}
            </View>

            {/* SECTION 2: MANUAL TEXT FALLBACK & QUICK TEMPLATES */}
            <View style={[styles.fallbackCard, isDark && styles.fallbackCardDark, theme.shadows.soft]}>
              <View style={styles.fallbackHeader}>
                <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
                <Text style={[styles.fallbackTitle, isDark && styles.textLight]}>
                  Or Type Your Transaction Sentence
                </Text>
              </View>

              <TextInput
                style={[styles.textInput, isDark && styles.textInputDark]}
                placeholder='e.g. "I spent 250 rupees on lunch today"'
                placeholderTextColor={isDark ? '#64748B' : theme.colors.textMuted}
                value={manualText}
                onChangeText={setManualText}
              />

              {/* Quick Template Chips */}
              <Text style={[styles.samplesHeader, isDark && styles.textMutedDark]}>
                Quick examples you can tap:
              </Text>
              <View style={styles.chipsRow}>
                {SAMPLE_VOICE_PROMPTS.map((prompt, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.sampleChip, isDark && styles.sampleChipDark]}
                    onPress={() => {
                      setManualText(prompt);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="sparkles" size={12} color={theme.colors.primary} />
                    <Text style={[styles.sampleChipText, isDark && styles.sampleChipTextDark]}>
                      "{prompt}"
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <PrimaryButton
                title="Parse Voice Sentence"
                onPress={handleManualParse}
                disabled={!manualText.trim()}
                icon={<Ionicons name="sparkles" size={18} color="#FFFFFF" />}
                style={styles.parseBtn}
              />
            </View>
          </View>
        ) : (
          /* SECTION 3: EDITABLE CONFIRMATION REVIEW FORM */
          <View style={[styles.reviewCard, isDark && styles.reviewCardDark, theme.shadows.soft]}>
            <View style={styles.reviewHeader}>
              <View style={[styles.reviewIconCircle, { backgroundColor: isDark ? '#1E1B4B' : theme.colors.primaryLight }]}>
                <Ionicons name="sparkles" size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.reviewHeaderTextGroup}>
                <Text style={[styles.reviewTitle, isDark && styles.textLight]}>Review & Confirm</Text>
                <Text style={[styles.reviewSubtitle, isDark && styles.textMutedDark]}>
                  Verify extracted details before saving
                </Text>
              </View>
            </View>

            {/* Transcript Reference */}
            <View style={[styles.referenceBox, isDark && styles.referenceBoxDark]}>
              <Text style={[styles.referenceLabel, isDark && styles.textMutedDark]}>Spoken Transcript:</Text>
              <Text style={[styles.referenceText, isDark && styles.textLight]}>"{transcript}"</Text>
            </View>

            {/* Validation / Missing fields notice */}
            {parsedTx.parseError ? (
              <View style={styles.warningBox}>
                <Ionicons name="alert-circle" size={16} color="#D97706" />
                <Text style={styles.warningText}>{parsedTx.parseError}</Text>
              </View>
            ) : null}

            {saveError ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={theme.colors.error} />
                <Text style={styles.errorText}>{saveError}</Text>
              </View>
            ) : null}

            {/* Type Switcher */}
            <Text style={[styles.fieldLabel, isDark && styles.textMutedDark]}>Transaction Type</Text>
            <View style={[styles.typeSwitcher, isDark && styles.typeSwitcherDark]}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  editType === 'EXPENSE' && styles.typeButtonExpense,
                ]}
                onPress={() => {
                  setEditType('EXPENSE');
                  setEditCategory(EXPENSE_CATEGORIES[0].name);
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="arrow-up-circle"
                  size={16}
                  color={editType === 'EXPENSE' ? '#EF4444' : theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.typeBtnText,
                    editType === 'EXPENSE' && { color: '#EF4444', fontWeight: '700' },
                  ]}
                >
                  Expense
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeButton,
                  editType === 'INCOME' && styles.typeButtonIncome,
                ]}
                onPress={() => {
                  setEditType('INCOME');
                  setEditCategory(INCOME_CATEGORIES[0].name);
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="arrow-down-circle"
                  size={16}
                  color={editType === 'INCOME' ? '#10B981' : theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.typeBtnText,
                    editType === 'INCOME' && { color: '#10B981', fontWeight: '700' },
                  ]}
                >
                  Income
                </Text>
              </TouchableOpacity>
            </View>

            {/* Merchant / Title */}
            <FormInput
              label="Merchant / Description"
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="e.g. Lunch, Coffee, Petrol"
              leftIcon={<Ionicons name="business-outline" size={18} color={theme.colors.textSecondary} />}
            />

            {/* Amount */}
            <FormInput
              label={`Amount (${currencyInfo.symbol} ${currencyInfo.code})`}
              value={editAmount}
              onChangeText={setEditAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              leftIcon={<Ionicons name="cash-outline" size={18} color={theme.colors.textSecondary} />}
            />

            {/* Date */}
            <FormInput
              label="Date (YYYY-MM-DD)"
              value={editDate}
              onChangeText={setEditDate}
              placeholder="YYYY-MM-DD"
              leftIcon={<Ionicons name="calendar-outline" size={18} color={theme.colors.textSecondary} />}
            />

            {/* Category */}
            <Text style={[styles.fieldLabel, isDark && styles.textMutedDark]}>Category</Text>
            <View style={styles.categoryChipsWrap}>
              {categories.map((cat) => {
                const isSelected = editCategory === cat.name;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      isDark && styles.categoryChipDark,
                      isSelected && {
                        backgroundColor: isDark ? '#1E1B4B' : cat.bgColor,
                        borderColor: cat.color,
                        borderWidth: 1.5,
                      },
                    ]}
                    onPress={() => setEditCategory(cat.name)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={cat.icon}
                      size={14}
                      color={isSelected ? cat.color : theme.colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        isSelected && { color: cat.color, fontWeight: '700' },
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Action Buttons */}
            <View style={styles.confirmationActions}>
              <PrimaryButton
                title={isSaving ? 'Saving...' : 'Confirm & Save Transaction'}
                onPress={handleConfirmAndSave}
                loading={isSaving}
                disabled={isSaving}
                icon={<Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />}
                style={styles.confirmBtn}
              />

              <TouchableOpacity
                style={[styles.retryBtn, isDark && styles.retryBtnDark]}
                onPress={resetEntry}
                activeOpacity={0.7}
              >
                <Ionicons name="repeat-outline" size={16} color={theme.colors.primary} />
                <Text style={styles.retryBtnText}>Speak Again / Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
  micCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  micCardDark: {
    backgroundColor: '#151C2C',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardHeadline: {
    ...theme.typography.title,
    fontSize: 20,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  cardSubtitle: {
    ...theme.typography.body,
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  micButtonContainer: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
    position: 'relative',
  },
  listeningRipple: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonIdle: {
    backgroundColor: theme.colors.primary,
  },
  micButtonActive: {
    backgroundColor: '#EF4444',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: theme.borderRadius.full,
    marginBottom: theme.spacing.md,
  },
  statusPillIdle: {
    backgroundColor: '#EEF2FF',
  },
  statusPillActive: {
    backgroundColor: '#FEE2E2',
  },
  statusPillDisabled: {
    backgroundColor: '#F1F5F9',
  },
  statusPillDark: {
    backgroundColor: '#1E1B4B',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  transcriptBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  transcriptBoxDark: {
    backgroundColor: '#0F172A',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  transcriptLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  transcriptText: {
    ...theme.typography.body,
    fontSize: 14,
    fontStyle: 'italic',
    color: theme.colors.textPrimary,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
    width: '100%',
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.error,
    marginLeft: 6,
    flex: 1,
  },
  fallbackCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  fallbackCardDark: {
    backgroundColor: '#151C2C',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  fallbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  fallbackTitle: {
    ...theme.typography.title,
    fontSize: 15,
    color: theme.colors.textPrimary,
    marginLeft: 8,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    fontSize: 14,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  textInputDark: {
    backgroundColor: '#0F172A',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    color: '#F8FAFC',
  },
  samplesHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  chipsRow: {
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
    fontWeight: '500',
    color: theme.colors.primary,
    marginLeft: 4,
  },
  sampleChipTextDark: {
    color: '#A5B4FC',
  },
  parseBtn: {
    minHeight: 48,
  },
  reviewCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  reviewCardDark: {
    backgroundColor: '#151C2C',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  reviewIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reviewHeaderTextGroup: {
    flex: 1,
  },
  reviewTitle: {
    ...theme.typography.title,
    fontSize: 17,
    color: theme.colors.textPrimary,
  },
  reviewSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  referenceBox: {
    backgroundColor: '#F1F5F9',
    padding: theme.spacing.sm + 2,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  referenceBoxDark: {
    backgroundColor: '#0F172A',
  },
  referenceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  referenceText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  warningText: {
    fontSize: 12,
    color: '#92400E',
    marginLeft: 6,
    flex: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  fieldLabel: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 8,
  },
  typeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: theme.borderRadius.lg,
    padding: 4,
    marginBottom: theme.spacing.sm,
  },
  typeSwitcherDark: {
    backgroundColor: '#1E293B',
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
  },
  typeButtonExpense: {
    backgroundColor: '#FFFFFF',
  },
  typeButtonIncome: {
    backgroundColor: '#FFFFFF',
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginLeft: 6,
  },
  categoryChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: theme.spacing.lg,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.full,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryChipDark: {
    backgroundColor: '#1E293B',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginLeft: 6,
  },
  confirmationActions: {
    gap: 10,
    marginTop: theme.spacing.sm,
  },
  confirmBtn: {
    minHeight: 48,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: '#EEF2FF',
  },
  retryBtnDark: {
    backgroundColor: '#1E1B4B',
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
    marginLeft: 6,
  },
  successCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  successCardDark: {
    backgroundColor: '#151C2C',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  successTitle: {
    ...theme.typography.title,
    fontSize: 20,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  successSub: {
    ...theme.typography.body,
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  successActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  btnOutlineDark: {
    backgroundColor: '#1E1B4B',
    borderColor: '#3730A3',
  },
  btnOutlineText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
    marginLeft: 6,
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.primary,
  },
  btnPrimaryText: {
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
