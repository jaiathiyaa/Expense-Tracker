import { assistantQueryService, DateRange, ComparisonResult, CategoryBreakdownItem } from './assistantQueryService';
import { assistantLlmService, ExtractedIntent } from './assistantLlmService';
import { assistantContextService, ConversationContext } from './assistantContextService';

export type AssistantIntentType =
  | 'TOTAL_EXPENSE'
  | 'TOTAL_INCOME'
  | 'CATEGORY_SPENDING'
  | 'LARGEST_EXPENSES'
  | 'TOP_CATEGORIES'
  | 'MONTHLY_COMPARISON'
  | 'WEEKLY_COMPARISON'
  | 'AVERAGE_DAILY'
  | 'GREETING'
  | 'UNKNOWN';

export interface AssistantResponse {
  answer: string;
  intent: AssistantIntentType;
  data?: any;
  suggestions?: string[];
  meta?: {
    source: 'llm' | 'regex_fallback';
    model?: string;
    phrasedByLlm?: boolean;
  };
}

const CATEGORY_KEYWORDS: Record<string, string> = {
  food: 'Food & Dining',
  dining: 'Food & Dining',
  dinner: 'Food & Dining',
  lunch: 'Food & Dining',
  breakfast: 'Food & Dining',
  restaurant: 'Food & Dining',
  groceries: 'Food & Dining',
  grocery: 'Food & Dining',
  swiggy: 'Food & Dining',
  zomato: 'Food & Dining',
  coffee: 'Food & Dining',
  cafe: 'Food & Dining',

  housing: 'Housing & Rent',
  rent: 'Housing & Rent',
  maintenance: 'Housing & Rent',

  bills: 'Bills & Utilities',
  utilities: 'Bills & Utilities',
  electricity: 'Bills & Utilities',
  water: 'Bills & Utilities',
  internet: 'Bills & Utilities',
  wifi: 'Bills & Utilities',
  recharge: 'Bills & Utilities',

  travel: 'Travel & Transport',
  transport: 'Travel & Transport',
  commute: 'Travel & Transport',
  cab: 'Travel & Transport',
  uber: 'Travel & Transport',
  ola: 'Travel & Transport',
  metro: 'Travel & Transport',
  fuel: 'Travel & Transport',
  petrol: 'Travel & Transport',
  flight: 'Travel & Transport',

  shopping: 'Shopping',
  clothes: 'Shopping',
  amazon: 'Shopping',
  flipkart: 'Shopping',

  salary: 'Work & Salary',
  work: 'Work & Salary',
  freelance: 'Work & Salary',
  bonus: 'Work & Salary',

  entertainment: 'Entertainment',
  movie: 'Entertainment',
  movies: 'Entertainment',
  netflix: 'Entertainment',
  games: 'Entertainment',

  health: 'Health & Medical',
  medical: 'Health & Medical',
  doctor: 'Health & Medical',
  medicine: 'Health & Medical',
  hospital: 'Health & Medical',
};

const DEFAULT_SUGGESTIONS = [
  'How much did I spend this month?',
  'What is my biggest expense?',
  'How much did I spend on food this week?',
  'Compare this month with last month',
  'Which category accounts for most of my expenses?',
  'How much income did I receive this month?',
  'Show my five largest expenses',
];

export const assistantNlpService = {
  /**
   * Identifies intent and parameters from natural text
   */
  /**
   * Identifies intent and parameters from natural text, resolving follow-up questions
   * using the active conversation context when available.
   */
  classifyIntent(message: string, context?: ConversationContext | null): {
    intent: AssistantIntentType;
    datePreset: string;
    specificMonth?: string;
    category?: string;
    limit?: number;
  } {
    const text = message.toLowerCase().trim();

    // 1. Greetings & Help
    if (/^(hi|hello|hey|help|what can you do|good morning|good evening)/i.test(text)) {
      return { intent: 'GREETING', datePreset: 'this_month' };
    }

    // 2. Date Range extraction
    let hasExplicitDate = false;
    let datePreset = 'this_month';
    if (/\btoday\b/.test(text)) { datePreset = 'today'; hasExplicitDate = true; }
    else if (/\byesterday\b/.test(text)) { datePreset = 'yesterday'; hasExplicitDate = true; }
    else if (/\blast\s+week\b/.test(text)) { datePreset = 'last_week'; hasExplicitDate = true; }
    else if (/\bthis\s+week\b|\bweek\b/.test(text)) { datePreset = 'this_week'; hasExplicitDate = true; }
    else if (/\blast\s+month\b/.test(text)) { datePreset = 'last_month'; hasExplicitDate = true; }
    else if (/\bthis\s+year\b|\byear\b/.test(text)) { datePreset = 'this_year'; hasExplicitDate = true; }
    else if (/\bthis\s+month\b|\bmonth\b/.test(text)) { datePreset = 'this_month'; hasExplicitDate = true; }

    // Check for specific named month (e.g. "January", "March")
    const monthMatch = text.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i);
    const specificMonth = monthMatch ? monthMatch[1] : undefined;
    if (specificMonth) hasExplicitDate = true;

    // 3. Conversational Follow-up Heuristics (Inherit Context)
    if (context && context.lastIntent) {
      // 3a. Limit follow-up: e.g. "show the top five instead", "show top 3 instead", "top 5 instead"
      if (/\b(instead|top\s+\d+|show\s+\d+)\b/i.test(text) || /\bshow\s+(the\s+)?(top\s+)?(\d+|one|three|five|ten)(\s+instead)?\b/i.test(text)) {
        let limit = 5;
        const numMatch = text.match(/\b(\d+)\b/);
        if (numMatch) limit = parseInt(numMatch[1], 10);
        else if (/\bone\b/.test(text)) limit = 1;
        else if (/\bthree\b/.test(text)) limit = 3;
        else if (/\bfive\b/.test(text)) limit = 5;
        else if (/\bten\b/.test(text)) limit = 10;

        return {
          intent: context.lastIntent === 'TOP_CATEGORIES' ? 'TOP_CATEGORIES' : 'LARGEST_EXPENSES',
          datePreset: context.lastDatePreset,
          specificMonth: context.lastSpecificMonth,
          limit,
        };
      }

      // 3b. Category follow-up: e.g. "only food", "just food", "what about food", "only groceries"
      for (const [kw, catName] of Object.entries(CATEGORY_KEYWORDS)) {
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        if (regex.test(text)) {
          if (/\b(only|just|what about|how about|what of)\b/i.test(text) || !/\b(income|earned|salary|credited|compare)\b/i.test(text)) {
            return {
              intent: 'CATEGORY_SPENDING',
              category: catName,
              datePreset: hasExplicitDate ? datePreset : context.lastDatePreset,
              specificMonth: specificMonth || context.lastSpecificMonth,
            };
          }
        }
      }

      // 3c. Timeframe follow-up: e.g. "what about last month?", "how about yesterday?", "and this week?"
      if (/\b(what about|how about|and for|and in|what of)\b/i.test(text) || (!/\b(spend|spent|spending|expense|expenses|cost|income|salary|earned|category|largest)\b/i.test(text) && hasExplicitDate)) {
        return {
          intent: context.lastIntent,
          datePreset,
          specificMonth,
          category: context.lastCategory,
          limit: context.lastLimit,
        };
      }
    } else {
      // Ambiguous follow-up without active context -> ask for clarification
      if (/\b(what about|how about|what of)\b/i.test(text)) {
        return { intent: 'UNKNOWN', datePreset: 'this_month' };
      }
    }

    // 4. Comparisons
    if (/\bcompare\b.*\b(month|last month)/.test(text) || /\bthis month.*(vs|versus|than).*last month\b/.test(text)) {
      return { intent: 'MONTHLY_COMPARISON', datePreset: 'this_month' };
    }
    if (/\bcompare\b.*\b(week|last week)/.test(text) || /\bthis week.*(vs|versus|than).*last week\b/.test(text)) {
      return { intent: 'WEEKLY_COMPARISON', datePreset: 'this_week' };
    }

    // 5. Largest / Top Expenses
    if (/\b(largest|biggest|highest|most expensive|top)\s+(expense|spending|transaction|purchase)/.test(text) ||
        /\b(five|5|three|3|ten|10)\s+largest\s+expenses\b/.test(text)) {
      let limit = 5;
      if (/\b(one|1|biggest|single|largest)\b/.test(text) && !/\b(five|5|three|3|ten|10)\b/.test(text)) {
        limit = 1;
      } else {
        const numMatch = text.match(/\b(\d+)\b/);
        if (numMatch) limit = parseInt(numMatch[1], 10);
      }
      return { intent: 'LARGEST_EXPENSES', datePreset, specificMonth, limit };
    }

    // 6. Category Breakdown / Top Categories
    if (/\b(which category|top category|top categories|most of my expenses|where did i spend the most|spending breakdown)\b/.test(text)) {
      return { intent: 'TOP_CATEGORIES', datePreset, specificMonth };
    }

    // 7. Category-Specific queries
    for (const [kw, catName] of Object.entries(CATEGORY_KEYWORDS)) {
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      if (regex.test(text)) {
        return { intent: 'CATEGORY_SPENDING', category: catName, datePreset, specificMonth };
      }
    }

    // 8. Income Queries
    if (/\b(income|earned|earnings|received|salary|credited)\b/.test(text)) {
      return { intent: 'TOTAL_INCOME', datePreset, specificMonth };
    }

    // 9. Daily Average
    if (/\b(average daily|daily average|per day|average per day)\b/.test(text)) {
      return { intent: 'AVERAGE_DAILY', datePreset, specificMonth };
    }

    // 10. Total Expenses (general "how much did I spend", "total expenses")
    if (/\b(spend|spent|spending|expense|expenses|cost|total)\b/.test(text)) {
      return { intent: 'TOTAL_EXPENSE', datePreset, specificMonth };
    }

    return { intent: 'UNKNOWN', datePreset };
  },

  /**
   * Processes the question using LLM intent extraction with deterministic database calculations,
   * maintaining lightweight scoped conversation context and falling back automatically to
   * the rule-based regex classifier if the LLM is unavailable or fails.
   */
  async processQuery(
    userId: string,
    rawMessage: string,
    options?: { forceFallback?: boolean; enableLlmPhrasing?: boolean; resetContext?: boolean }
  ): Promise<AssistantResponse> {
    if (options?.resetContext) {
      assistantContextService.clearContext(userId);
    }

    const context = assistantContextService.getContext(userId);
    let parsed: ExtractedIntent | null = null;
    const enableLlmPhrasing = options?.forceFallback ? false : (options?.enableLlmPhrasing ?? true);

    if (!options?.forceFallback) {
      try {
        parsed = await assistantLlmService.extractIntent(rawMessage, context);
      } catch (err: any) {
        console.warn('[assistantNlpService] Error during LLM extraction, falling back to regex:', err.message);
        parsed = null;
      }
    }

    if (!parsed) {
      const regexFallback = this.classifyIntent(rawMessage, context);
      parsed = {
        ...regexFallback,
        source: 'regex_fallback',
      };
    }

    const response = await this.executeIntent(userId, parsed, {
      rawMessage,
      enableLlmPhrasing,
    });

    // Update conversation context for supported analytical intents
    if (response.intent !== 'GREETING' && response.intent !== 'UNKNOWN') {
      assistantContextService.updateContext(userId, {
        intent: response.intent,
        datePreset: parsed.datePreset,
        specificMonth: parsed.specificMonth,
        category: parsed.category,
        limit: parsed.limit,
      });
    } else if (response.intent === 'GREETING') {
      assistantContextService.clearContext(userId);
    }

    return {
      answer: response.answer,
      intent: response.intent,
      data: response.data,
      suggestions: response.suggestions,
      meta: {
        source: parsed.source,
        ...(parsed.modelUsed ? { model: parsed.modelUsed } : {}),
        ...(response.meta?.phrasedByLlm !== undefined ? { phrasedByLlm: response.meta.phrasedByLlm } : {}),
      },
    };
  },

  /**
   * Executes deterministic financial calculations against Prisma based on validated intent.
   * Grounded aggregate summaries are formatted into natural answers via LLM when available,
   * with automatic fallback to deterministic templates if phrasing fails or violates grounding.
   */
  async executeIntent(
    userId: string,
    parsed: Omit<ExtractedIntent, 'source' | 'modelUsed'>,
    options?: { rawMessage?: string; enableLlmPhrasing?: boolean }
  ): Promise<AssistantResponse & { meta?: { phrasedByLlm?: boolean } }> {
    const rawMessage = options?.rawMessage;
    const enablePhrasing = options?.enableLlmPhrasing ?? false;

    // Resolve date range
    let dateRange: DateRange;
    if (parsed.specificMonth) {
      const specific = assistantQueryService.resolveSpecificMonth(parsed.specificMonth);
      dateRange = specific || assistantQueryService.resolveDateRange(parsed.datePreset);
    } else {
      dateRange = assistantQueryService.resolveDateRange(parsed.datePreset);
    }

    switch (parsed.intent) {
      case 'GREETING': {
        return {
          intent: 'GREETING',
          answer:
            "Hello! I am your AI Expense Assistant. I can calculate your spending, analyze category trends, compare months, and find your biggest expenses. What would you like to know?",
          suggestions: DEFAULT_SUGGESTIONS,
        };
      }

      case 'TOTAL_EXPENSE': {
        const { total, count } = await assistantQueryService.getTotalExpenses(
          userId,
          dateRange.start,
          dateRange.end
        );

        if (count === 0) {
          return {
            intent: 'TOTAL_EXPENSE',
            answer: `You have not recorded any expenses for ${dateRange.label}.`,
            data: { total: 0, count: 0, currency: 'INR', dateRange: dateRange.label },
            suggestions: ['How much income did I receive this month?', 'Show my five largest expenses'],
          };
        }

        const templateAnswer = `Your total expenses for ${dateRange.label} amount to ₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })} across ${count} transaction${count === 1 ? '' : 's'}.`;
        let answer = templateAnswer;
        let phrasedByLlm = false;

        if (rawMessage && enablePhrasing) {
          const phrased = await assistantLlmService.phraseGroundedAnswer({
            userQuestion: rawMessage,
            intent: 'TOTAL_EXPENSE',
            aggregateSummary: {
              metric: 'Total Expenses',
              dateRange: dateRange.label,
              totalAmount: `₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
              numericTotal: total,
              transactionCount: count,
            },
            criticalNumbers: [total],
            fallbackTemplate: templateAnswer,
          });
          answer = phrased.answer;
          phrasedByLlm = phrased.phrasedByLlm;
        }

        return {
          intent: 'TOTAL_EXPENSE',
          answer,
          data: { total, count, currency: 'INR', dateRange: dateRange.label },
          suggestions: ['Which category accounts for most of my expenses?', 'Compare this month with last month'],
          meta: { source: 'llm', phrasedByLlm },
        };
      }

      case 'TOTAL_INCOME': {
        const { total, count } = await assistantQueryService.getTotalIncome(
          userId,
          dateRange.start,
          dateRange.end
        );

        if (count === 0) {
          return {
            intent: 'TOTAL_INCOME',
            answer: `You have no recorded income entries for ${dateRange.label}.`,
            data: { total: 0, count: 0, currency: 'INR', dateRange: dateRange.label },
            suggestions: ['How much did I spend this month?', 'What is my biggest expense?'],
          };
        }

        const templateAnswer = `You received ₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })} in total income for ${dateRange.label} across ${count} credit${count === 1 ? '' : 's'}.`;
        let answer = templateAnswer;
        let phrasedByLlm = false;

        if (rawMessage && enablePhrasing) {
          const phrased = await assistantLlmService.phraseGroundedAnswer({
            userQuestion: rawMessage,
            intent: 'TOTAL_INCOME',
            aggregateSummary: {
              metric: 'Total Income',
              dateRange: dateRange.label,
              totalAmount: `₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
              numericTotal: total,
              creditCount: count,
            },
            criticalNumbers: [total],
            fallbackTemplate: templateAnswer,
          });
          answer = phrased.answer;
          phrasedByLlm = phrased.phrasedByLlm;
        }

        return {
          intent: 'TOTAL_INCOME',
          answer,
          data: { total, count, currency: 'INR', dateRange: dateRange.label },
          suggestions: ['How much did I spend this month?', 'Which category accounts for most of my expenses?'],
          meta: { source: 'llm', phrasedByLlm },
        };
      }

      case 'CATEGORY_SPENDING': {
        const catName = parsed.category || 'General';
        const result = await assistantQueryService.getCategorySpending(
          userId,
          catName,
          dateRange.start,
          dateRange.end
        );

        if (result.count === 0) {
          return {
            intent: 'CATEGORY_SPENDING',
            answer: `You have not recorded any spending in the ${result.category} category for ${dateRange.label}.`,
            data: { category: result.category, total: 0, count: 0, currency: 'INR', dateRange: dateRange.label },
            suggestions: ['Which category accounts for most of my expenses?', 'How much did I spend this month?'],
          };
        }

        const templateAnswer = `You spent ₹${result.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })} on ${result.category} for ${dateRange.label} across ${result.count} transaction${result.count === 1 ? '' : 's'}.`;
        let answer = templateAnswer;
        let phrasedByLlm = false;

        if (rawMessage && enablePhrasing) {
          const phrased = await assistantLlmService.phraseGroundedAnswer({
            userQuestion: rawMessage,
            intent: 'CATEGORY_SPENDING',
            aggregateSummary: {
              metric: 'Category Spending',
              category: result.category,
              dateRange: dateRange.label,
              totalAmount: `₹${result.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
              numericTotal: result.total,
              transactionCount: result.count,
            },
            criticalNumbers: [result.total],
            fallbackTemplate: templateAnswer,
          });
          answer = phrased.answer;
          phrasedByLlm = phrased.phrasedByLlm;
        }

        return {
          intent: 'CATEGORY_SPENDING',
          answer,
          data: {
            category: result.category,
            total: result.total,
            count: result.count,
            currency: 'INR',
            dateRange: dateRange.label,
            transactions: result.transactions.slice(0, 5),
          },
          suggestions: ['What is my biggest expense?', 'Which category accounts for most of my expenses?'],
          meta: { source: 'llm', phrasedByLlm },
        };
      }

      case 'TOP_CATEGORIES': {
        const { categories, totalExpenses } = await assistantQueryService.getTopCategories(
          userId,
          dateRange.start,
          dateRange.end,
          5
        );

        if (categories.length === 0) {
          return {
            intent: 'TOP_CATEGORIES',
            answer: `No categorized expenses found for ${dateRange.label}.`,
            data: { categories: [], totalExpenses: 0, currency: 'INR', dateRange: dateRange.label },
            suggestions: ['How much did I spend this month?', 'How much income did I receive this month?'],
          };
        }

        const topCat = categories[0];
        const breakdownLines = categories
          .map((c, i) => `${i + 1}. ${c.category}: ₹${c.total.toLocaleString('en-IN')} (${c.percentage}%)`)
          .join('\n');

        const templateAnswer = `Your highest spending category for ${dateRange.label} is ${topCat.category}, accounting for ₹${topCat.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${topCat.percentage}% of total expenses).\n\nTop Categories Breakdown:\n${breakdownLines}`;
        let answer = templateAnswer;
        let phrasedByLlm = false;

        if (rawMessage && enablePhrasing) {
          const phrased = await assistantLlmService.phraseGroundedAnswer({
            userQuestion: rawMessage,
            intent: 'TOP_CATEGORIES',
            aggregateSummary: {
              metric: 'Top Categories Breakdown',
              dateRange: dateRange.label,
              topCategory: topCat.category,
              topCategoryTotal: `₹${topCat.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
              numericTopCategoryTotal: topCat.total,
              topCategoryPercentage: `${topCat.percentage}%`,
              numericTopCategoryPercentage: topCat.percentage,
              totalExpenses: `₹${totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
              numericTotalExpenses: totalExpenses,
              categories: categories.map((c) => ({
                category: c.category,
                total: `₹${c.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
                numericTotal: c.total,
                percentage: `${c.percentage}%`,
                numericPercentage: c.percentage,
              })),
            },
            criticalNumbers: [topCat.total],
            fallbackTemplate: templateAnswer,
          });
          answer = phrased.answer;
          phrasedByLlm = phrased.phrasedByLlm;
        }

        return {
          intent: 'TOP_CATEGORIES',
          answer,
          data: {
            topCategory: topCat.category,
            categories,
            totalExpenses,
            currency: 'INR',
            dateRange: dateRange.label,
          },
          suggestions: ['Show my five largest expenses', 'Compare this month with last month'],
          meta: { source: 'llm', phrasedByLlm },
        };
      }

      case 'LARGEST_EXPENSES': {
        const limit = parsed.limit || 5;
        const largest = await assistantQueryService.getLargestExpenses(
          userId,
          dateRange.start,
          dateRange.end,
          limit
        );

        if (largest.length === 0) {
          return {
            intent: 'LARGEST_EXPENSES',
            answer: `No expense records found for ${dateRange.label}.`,
            data: { items: [], currency: 'INR', dateRange: dateRange.label },
            suggestions: ['How much did I spend this month?', 'How much income did I receive this month?'],
          };
        }

        if (limit === 1) {
          const single = largest[0];
          const templateAnswer = `Your biggest single expense for ${dateRange.label} is "${single.title}" for ₹${single.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${single.category || 'General'}).`;
          let answer = templateAnswer;
          let phrasedByLlm = false;

          if (rawMessage && enablePhrasing) {
            const phrased = await assistantLlmService.phraseGroundedAnswer({
              userQuestion: rawMessage,
              intent: 'LARGEST_EXPENSES',
              aggregateSummary: {
                metric: 'Single Largest Expense',
                dateRange: dateRange.label,
                title: single.title,
                amount: `₹${single.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
                numericAmount: single.amount,
                category: single.category || 'General',
              },
              criticalNumbers: [single.amount],
              fallbackTemplate: templateAnswer,
            });
            answer = phrased.answer;
            phrasedByLlm = phrased.phrasedByLlm;
          }

          return {
            intent: 'LARGEST_EXPENSES',
            answer,
            data: { items: largest, currency: 'INR', dateRange: dateRange.label },
            suggestions: ['Show my five largest expenses', 'Which category accounts for most of my expenses?'],
            meta: { source: 'llm', phrasedByLlm },
          };
        }

        const itemsList = largest
          .map(
            (t, i) =>
              `${i + 1}. ${t.title}: ₹${t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${t.category || 'General'})`
          )
          .join('\n');

        const templateAnswer = `Here are your ${largest.length} largest expenses for ${dateRange.label}:\n\n${itemsList}`;
        let answer = templateAnswer;
        let phrasedByLlm = false;

        if (rawMessage && enablePhrasing) {
          const phrased = await assistantLlmService.phraseGroundedAnswer({
            userQuestion: rawMessage,
            intent: 'LARGEST_EXPENSES',
            aggregateSummary: {
              metric: 'Largest Expenses List',
              dateRange: dateRange.label,
              itemsCount: largest.length,
              items: largest.map((t) => ({
                title: t.title,
                amount: `₹${t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
                numericAmount: t.amount,
                category: t.category || 'General',
              })),
            },
            criticalNumbers: [largest[0].amount],
            fallbackTemplate: templateAnswer,
          });
          answer = phrased.answer;
          phrasedByLlm = phrased.phrasedByLlm;
        }

        return {
          intent: 'LARGEST_EXPENSES',
          answer,
          data: { items: largest, currency: 'INR', dateRange: dateRange.label },
          suggestions: ['Which category accounts for most of my expenses?', 'Compare this month with last month'],
          meta: { source: 'llm', phrasedByLlm },
        };
      }

      case 'MONTHLY_COMPARISON': {
        const comp = await assistantQueryService.getMonthlyComparison(userId);
        let phrase = '';
        if (comp.trend === 'INCREASED') {
          phrase = `Your spending increased by ₹${Math.abs(comp.difference).toLocaleString('en-IN', { minimumFractionDigits: 2 })}${comp.percentageChange !== null ? ` (+${comp.percentageChange}%)` : ''} compared to last month.`;
        } else if (comp.trend === 'DECREASED') {
          phrase = `Great job! Your spending decreased by ₹${Math.abs(comp.difference).toLocaleString('en-IN', { minimumFractionDigits: 2 })}${comp.percentageChange !== null ? ` (${comp.percentageChange}%)` : ''} compared to last month.`;
        } else {
          phrase = `Your spending is identical between this month and last month.`;
        }

        const templateAnswer = `Monthly Spending Comparison:\n• This Month: ₹${comp.currentTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n• Last Month: ₹${comp.previousTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n\n${phrase}`;
        let answer = templateAnswer;
        let phrasedByLlm = false;

        if (rawMessage && enablePhrasing) {
          const phrased = await assistantLlmService.phraseGroundedAnswer({
            userQuestion: rawMessage,
            intent: 'MONTHLY_COMPARISON',
            aggregateSummary: {
              metric: 'Monthly Spending Comparison',
              thisMonth: `₹${comp.currentTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
              numericThisMonth: comp.currentTotal,
              lastMonth: `₹${comp.previousTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
              numericLastMonth: comp.previousTotal,
              difference: `₹${Math.abs(comp.difference).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
              numericDifference: Math.abs(comp.difference),
              percentageChange: comp.percentageChange !== null ? `${comp.percentageChange}%` : null,
              numericPercentageChange: comp.percentageChange,
              trend: comp.trend,
            },
            criticalNumbers: [comp.currentTotal, comp.previousTotal],
            fallbackTemplate: templateAnswer,
          });
          answer = phrased.answer;
          phrasedByLlm = phrased.phrasedByLlm;
        }

        return {
          intent: 'MONTHLY_COMPARISON',
          answer,
          data: { ...comp, currency: 'INR' },
          suggestions: ['Which category accounts for most of my expenses?', 'Show my five largest expenses'],
          meta: { source: 'llm', phrasedByLlm },
        };
      }

      case 'WEEKLY_COMPARISON': {
        const comp = await assistantQueryService.getWeeklyComparison(userId);
        let phrase = '';
        if (comp.trend === 'INCREASED') {
          phrase = `You spent ₹${Math.abs(comp.difference).toLocaleString('en-IN', { minimumFractionDigits: 2 })}${comp.percentageChange !== null ? ` more (+${comp.percentageChange}%)` : ''} than last week.`;
        } else if (comp.trend === 'DECREASED') {
          phrase = `You spent ₹${Math.abs(comp.difference).toLocaleString('en-IN', { minimumFractionDigits: 2 })}${comp.percentageChange !== null ? ` less (${comp.percentageChange}%)` : ''} than last week.`;
        } else {
          phrase = `Your spending is unchanged compared to last week.`;
        }

        const templateAnswer = `Weekly Spending Comparison:\n• This Week: ₹${comp.currentTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n• Last Week: ₹${comp.previousTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n\n${phrase}`;
        let answer = templateAnswer;
        let phrasedByLlm = false;

        if (rawMessage && enablePhrasing) {
          const phrased = await assistantLlmService.phraseGroundedAnswer({
            userQuestion: rawMessage,
            intent: 'WEEKLY_COMPARISON',
            aggregateSummary: {
              metric: 'Weekly Spending Comparison',
              thisWeek: `₹${comp.currentTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
              numericThisWeek: comp.currentTotal,
              lastWeek: `₹${comp.previousTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
              numericLastWeek: comp.previousTotal,
              difference: `₹${Math.abs(comp.difference).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
              numericDifference: Math.abs(comp.difference),
              percentageChange: comp.percentageChange !== null ? `${comp.percentageChange}%` : null,
              numericPercentageChange: comp.percentageChange,
              trend: comp.trend,
            },
            criticalNumbers: [comp.currentTotal, comp.previousTotal],
            fallbackTemplate: templateAnswer,
          });
          answer = phrased.answer;
          phrasedByLlm = phrased.phrasedByLlm;
        }

        return {
          intent: 'WEEKLY_COMPARISON',
          answer,
          data: { ...comp, currency: 'INR' },
          suggestions: ['How much did I spend this month?', 'Compare this month with last month'],
          meta: { source: 'llm', phrasedByLlm },
        };
      }

      case 'AVERAGE_DAILY': {
        const { avgDaily, total, days } = await assistantQueryService.getAverageDailySpending(
          userId,
          dateRange.start,
          dateRange.end
        );

        const templateAnswer = `Your average daily spending for ${dateRange.label} is ₹${avgDaily.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (total ₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })} over ${days} day${days === 1 ? '' : 's'}).`;
        let answer = templateAnswer;
        let phrasedByLlm = false;

        if (rawMessage && enablePhrasing) {
          const phrased = await assistantLlmService.phraseGroundedAnswer({
            userQuestion: rawMessage,
            intent: 'AVERAGE_DAILY',
            aggregateSummary: {
              metric: 'Average Daily Spending',
              dateRange: dateRange.label,
              averageDaily: `₹${avgDaily.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
              totalSpending: `₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
              numericAvgDaily: avgDaily,
              numericTotal: total,
              daysCount: days,
            },
            criticalNumbers: [avgDaily, total],
            fallbackTemplate: templateAnswer,
          });
          answer = phrased.answer;
          phrasedByLlm = phrased.phrasedByLlm;
        }

        return {
          intent: 'AVERAGE_DAILY',
          answer,
          data: { avgDaily, total, days, currency: 'INR', dateRange: dateRange.label },
          suggestions: ['How much did I spend this month?', 'Which category accounts for most of my expenses?'],
          meta: { source: 'llm', phrasedByLlm },
        };
      }

      default: {
        return {
          intent: 'UNKNOWN',
          answer:
            "I couldn't quite understand that question. I can answer questions about your expenses, income, top categories, comparisons, or largest purchases. Here are some examples you can try:",
          suggestions: DEFAULT_SUGGESTIONS,
        };
      }
    }
  },
};
