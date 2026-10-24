export interface CategoryDefinition {
  id: string;
  name: string;
  icon: any; // Ionicons glyph name
  color: string;
  bgColor: string;
}

export const EXPENSE_CATEGORIES: CategoryDefinition[] = [
  {
    id: 'food',
    name: 'Food & Dining',
    icon: 'restaurant-outline',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
  },
  {
    id: 'shopping',
    name: 'Shopping',
    icon: 'bag-handle-outline',
    color: '#10B981',
    bgColor: '#D1FAE5',
  },
  {
    id: 'housing',
    name: 'Housing & Rent',
    icon: 'home-outline',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
  },
  {
    id: 'bills',
    name: 'Bills & Utilities',
    icon: 'flash-outline',
    color: '#EF4444',
    bgColor: '#FEE2E2',
  },
  {
    id: 'transport',
    name: 'Travel & Transport',
    icon: 'car-outline',
    color: '#8B5CF6',
    bgColor: '#EDE9FE',
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    icon: 'film-outline',
    color: '#EC4899',
    bgColor: '#FCE7F3',
  },
  {
    id: 'health',
    name: 'Health & Medical',
    icon: 'medkit-outline',
    color: '#06B6D4',
    bgColor: '#CFFAFE',
  },
  {
    id: 'education',
    name: 'Education',
    icon: 'school-outline',
    color: '#6366F1',
    bgColor: '#E0E7FF',
  },
  {
    id: 'personal',
    name: 'Personal Care',
    icon: 'sparkles-outline',
    color: '#F97316',
    bgColor: '#FFEDD5',
  },
  {
    id: 'other_expense',
    name: 'Other',
    icon: 'ellipsis-horizontal-circle-outline',
    color: '#64748B',
    bgColor: '#F1F5F9',
  },
];

export const INCOME_CATEGORIES: CategoryDefinition[] = [
  {
    id: 'salary',
    name: 'Work & Salary',
    icon: 'briefcase-outline',
    color: '#059669',
    bgColor: '#D1FAE5',
  },
  {
    id: 'freelance',
    name: 'Freelance & Projects',
    icon: 'laptop-outline',
    color: '#2563EB',
    bgColor: '#DBEAFE',
  },
  {
    id: 'business',
    name: 'Business Income',
    icon: 'trending-up-outline',
    color: '#7C3AED',
    bgColor: '#EDE9FE',
  },
  {
    id: 'investment',
    name: 'Investments & Dividends',
    icon: 'stats-chart-outline',
    color: '#D97706',
    bgColor: '#FEF3C7',
  },
  {
    id: 'rental',
    name: 'Rental Income',
    icon: 'business-outline',
    color: '#0284C7',
    bgColor: '#E0F2FE',
  },
  {
    id: 'gifts',
    name: 'Gifts & Grants',
    icon: 'gift-outline',
    color: '#DB2777',
    bgColor: '#FCE7F3',
  },
  {
    id: 'refunds',
    name: 'Refunds & Cashback',
    icon: 'refresh-circle-outline',
    color: '#0D9488',
    bgColor: '#CCFBF1',
  },
  {
    id: 'other_income',
    name: 'Other',
    icon: 'cash-outline',
    color: '#64748B',
    bgColor: '#F1F5F9',
  },
];

export const getCategoryDefinition = (
  categoryName: string | null | undefined,
  type: 'EXPENSE' | 'INCOME' = 'EXPENSE'
): CategoryDefinition => {
  const list = type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const found = list.find(
    (c) => c.name.toLowerCase() === (categoryName || '').toLowerCase()
  );
  if (found) return found;

  const fallback = type === 'INCOME' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0];
  return {
    id: 'custom',
    name: categoryName || fallback.name,
    icon: type === 'INCOME' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline',
    color: type === 'INCOME' ? '#059669' : '#EF4444',
    bgColor: type === 'INCOME' ? '#D1FAE5' : '#FEE2E2',
  };
};
