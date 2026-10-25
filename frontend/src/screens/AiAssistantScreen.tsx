import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { assistantService, AssistantChatResponse } from '../services/assistantService';
import { formatINR } from '../utils/formatters';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  intent?: string;
  data?: any;
  suggestions?: string[];
  isError?: boolean;
}

const DEFAULT_SUGGESTIONS = [
  'How much did I spend this month?',
  'What is my biggest expense?',
  'How much did I spend on food this week?',
  'Compare this month with last month',
  'Which category accounts for most of my expenses?',
  'How much income did I receive this month?',
  'Show my five largest expenses',
];

export const AiAssistantScreen: React.FC = () => {
  const navigation = useNavigation();
  const { token } = useAuth();
  const { isDark } = useSettings();

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_1',
      sender: 'assistant',
      text: 'Hello! I am your AI Expense Assistant. Ask me anything about your spending, monthly budget, top categories, or recent expenses.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestions: DEFAULT_SUGGESTIONS.slice(0, 4),
    },
  ]);

  const flatListRef = useRef<FlatList>(null);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isLoading) return;

    if (!token) {
      const errMessage: ChatMessage = {
        id: `err_${Date.now()}`,
        sender: 'assistant',
        text: 'Your session has expired. Please log in again to ask questions.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setMessages((prev) => [...prev, errMessage]);
      return;
    }

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await assistantService.sendMessage(token, query);

      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        sender: 'assistant',
        text: response.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        intent: response.intent,
        data: response.data,
        suggestions: response.suggestions,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `err_${Date.now()}`,
        sender: 'assistant',
        text: err.message || 'Unable to get answer. Please check connection and try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    handleSend(suggestion);
  };

  const handleClearHistory = () => {
    if (token) {
      assistantService.resetConversation(token).catch(() => {});
    }
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        sender: 'assistant',
        text: 'Chat history cleared. How can I help you today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: DEFAULT_SUGGESTIONS.slice(0, 4),
      },
    ]);
  };

  // Render structured rich card if structured data is provided
  const renderStructuredData = (data: any, intent?: string) => {
    if (!data) return null;

    // Monthly or Weekly Comparison Card
    if (intent === 'MONTHLY_COMPARISON' || intent === 'WEEKLY_COMPARISON') {
      const isUp = data.trend === 'INCREASED';
      const isDown = data.trend === 'DECREASED';
      return (
        <View style={styles.dataCard}>
          <View style={styles.dataCardRow}>
            <View style={styles.comparisonCol}>
              <Text style={styles.comparisonLabel}>{data.currentPeriodLabel}</Text>
              <Text style={styles.comparisonValue}>{formatINR(data.currentTotal)}</Text>
            </View>
            <View style={styles.comparisonDivider} />
            <View style={styles.comparisonCol}>
              <Text style={styles.comparisonLabel}>{data.previousPeriodLabel}</Text>
              <Text style={styles.comparisonValue}>{formatINR(data.previousTotal)}</Text>
            </View>
          </View>

          {data.percentageChange !== null ? (
            <View
              style={[
                styles.trendPill,
                isDown ? styles.trendPillGood : isUp ? styles.trendPillWarn : styles.trendPillNeutral,
              ]}
            >
              <Ionicons
                name={isDown ? 'arrow-down' : isUp ? 'arrow-up' : 'remove'}
                size={14}
                color={isDown ? '#059669' : isUp ? '#DC2626' : '#4B5563'}
              />
              <Text
                style={[
                  styles.trendText,
                  { color: isDown ? '#059669' : isUp ? '#DC2626' : '#4B5563' },
                ]}
              >
                {Math.abs(data.percentageChange)}% {isDown ? 'less spent' : isUp ? 'more spent' : 'no change'}
              </Text>
            </View>
          ) : null}
        </View>
      );
    }

    // Top Categories Card
    if (intent === 'TOP_CATEGORIES' && Array.isArray(data.categories) && data.categories.length > 0) {
      return (
        <View style={styles.dataCard}>
          <Text style={styles.dataCardTitle}>Categories Breakdown</Text>
          {data.categories.slice(0, 4).map((c: any, idx: number) => (
            <View key={idx} style={styles.categoryItemRow}>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryName} numberOfLines={1}>{c.category}</Text>
                <Text style={styles.categoryAmount}>{formatINR(c.total)}</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${Math.min(100, c.percentage)}%` }]} />
              </View>
            </View>
          ))}
        </View>
      );
    }

    // Largest Expenses List Card
    if (intent === 'LARGEST_EXPENSES' && Array.isArray(data.items) && data.items.length > 1) {
      return (
        <View style={styles.dataCard}>
          <Text style={styles.dataCardTitle}>Top Expenses</Text>
          {data.items.slice(0, 5).map((item: any, idx: number) => (
            <View key={item.id || idx} style={styles.expenseItemRow}>
              <View style={styles.expenseItemLeft}>
                <Text style={styles.expenseRank}>#{idx + 1}</Text>
                <View>
                  <Text style={styles.expenseTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.expenseCat}>{item.category || 'General'}</Text>
                </View>
              </View>
              <Text style={styles.expenseAmount}>{formatINR(item.amount)}</Text>
            </View>
          ))}
        </View>
      );
    }

    return null;
  };

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isUser = item.sender === 'user';

    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}>
        {!isUser ? (
          <View style={styles.avatarBot}>
            <Ionicons name="sparkles" size={14} color="#FFFFFF" />
          </View>
        ) : null}

        <View
          style={[
            styles.bubble,
            isUser ? styles.userBubble : styles.assistantBubble,
            item.isError && styles.errorBubble,
            isDark && !isUser && styles.assistantBubbleDark,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userText : styles.assistantText,
              item.isError && styles.errorText,
              isDark && !isUser && styles.textLight,
            ]}
          >
            {item.text}
          </Text>

          {renderStructuredData(item.data, item.intent)}

          <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.assistantTimestamp]}>
            {item.timestamp}
          </Text>

          {/* Quick Suggestions below assistant message */}
          {!isUser && item.suggestions && item.suggestions.length > 0 ? (
            <View style={styles.inlineSuggestions}>
              <Text style={styles.suggestionsTitle}>Related questions:</Text>
              <View style={styles.suggestionsWrap}>
                {item.suggestions.map((sug, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.suggestionChip}
                    onPress={() => handleSuggestionPress(sug)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={12} color={theme.colors.primary} style={styles.sugIcon} />
                    <Text style={styles.suggestionText}>{sug}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        {isUser ? (
          <View style={styles.avatarUser}>
            <Ionicons name="person" size={14} color="#FFFFFF" />
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, isDark && styles.safeAreaDark]} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={[styles.header, isDark && styles.headerDark]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={24} color={isDark ? '#F3F4F6' : theme.colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleGroup}>
          <View style={styles.headerTitleRow}>
            <Text style={[styles.headerTitle, isDark && styles.textLight]}>AI Expense Assistant</Text>
            <View style={styles.livePill}>
              <View style={styles.onlineDot} />
              <Text style={styles.liveText}>Ready</Text>
            </View>
          </View>
          <Text style={[styles.headerSubtitle, isDark && styles.textMutedDark]}>
            Real-time financial intelligence
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleClearHistory}
          style={styles.clearBtn}
          accessibilityRole="button"
          accessibilityLabel="Clear history"
        >
          <Ionicons name="trash-outline" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            isLoading ? (
              <View style={styles.thinkingContainer}>
                <View style={styles.avatarBot}>
                  <Ionicons name="sparkles" size={14} color="#FFFFFF" />
                </View>
                <View style={[styles.bubble, styles.assistantBubble, styles.thinkingBubble]}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={styles.thinkingText}>Analyzing your transactions...</Text>
                </View>
              </View>
            ) : undefined
          }
        />

        {/* Suggested Questions Horizontal Carousel */}
        {messages.length <= 2 ? (
          <View style={styles.quickPromptContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickPromptScroll}>
              {DEFAULT_SUGGESTIONS.map((q, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.promptPill}
                  onPress={() => handleSuggestionPress(q)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="bulb-outline" size={13} color={theme.colors.primary} style={styles.promptIcon} />
                  <Text style={styles.promptText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Bottom Input Bar */}
        <View style={[styles.inputBar, isDark && styles.inputBarDark]}>
          <TextInput
            style={[styles.textInput, isDark && styles.textInputDark]}
            placeholder="Ask about your expenses, income, trends..."
            placeholderTextColor={isDark ? '#9CA3AF' : theme.colors.textMuted}
            value={inputMessage}
            onChangeText={setInputMessage}
            multiline
            maxLength={500}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputMessage.trim() || isLoading) && styles.sendButtonDisabled,
            ]}
            onPress={() => handleSend()}
            disabled={!inputMessage.trim() || isLoading}
            accessibilityRole="button"
            accessibilityLabel="Send question"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  safeAreaDark: {
    backgroundColor: '#0F172A',
  },
  flexOne: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  headerDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleGroup: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DEF7EC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#03543F',
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  clearBtn: {
    padding: 8,
  },
  textLight: {
    color: '#F8FAFC',
  },
  textMutedDark: {
    color: '#94A3B8',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  avatarBot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  avatarUser: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginBottom: 4,
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...theme.shadows.soft,
  },
  assistantBubbleDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  errorBubble: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  messageText: {
    fontSize: 14.5,
    lineHeight: 21,
  },
  userText: {
    color: '#FFFFFF',
  },
  assistantText: {
    color: '#1E293B',
  },
  errorText: {
    color: '#B91C1C',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  assistantTimestamp: {
    color: '#94A3B8',
  },
  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  thinkingText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '500',
    marginLeft: 8,
  },
  // Structured cards
  dataCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dataCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  dataCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  comparisonCol: {
    flex: 1,
    alignItems: 'center',
  },
  comparisonDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 8,
  },
  comparisonLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
    textAlign: 'center',
  },
  comparisonValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  trendPillGood: {
    backgroundColor: '#D1FAE5',
  },
  trendPillWarn: {
    backgroundColor: '#FEE2E2',
  },
  trendPillNeutral: {
    backgroundColor: '#F1F5F9',
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  categoryItemRow: {
    marginBottom: 8,
  },
  categoryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  categoryAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  progressBarBg: {
    height: 5,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 5,
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  expenseItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: '#EEF2F6',
  },
  expenseItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  expenseRank: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
    width: 24,
  },
  expenseTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  expenseCat: {
    fontSize: 11,
    color: '#64748B',
  },
  expenseAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.error,
  },
  // Inline suggestions
  inlineSuggestions: {
    marginTop: 10,
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
    paddingTop: 8,
  },
  suggestionsTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },
  suggestionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sugIcon: {
    marginRight: 4,
  },
  suggestionText: {
    fontSize: 11.5,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  // Quick Prompt Carousel
  quickPromptContainer: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  quickPromptScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  promptPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  promptIcon: {
    marginRight: 6,
  },
  promptText: {
    fontSize: 12.5,
    color: '#334155',
    fontWeight: '500',
  },
  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  inputBarDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: theme.colors.textPrimary,
    maxHeight: 90,
  },
  textInputDark: {
    backgroundColor: '#334155',
    color: '#F8FAFC',
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
});
