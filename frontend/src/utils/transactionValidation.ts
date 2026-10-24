export interface TransactionFormValues {
  title: string;
  amount: string;
  type: 'EXPENSE' | 'INCOME';
  category: string;
  date: Date;
  description: string;
}

export interface ValidationErrors {
  title?: string;
  amount?: string;
  type?: string;
  category?: string;
  date?: string;
}

export const validateTransactionForm = (
  values: TransactionFormValues
): { isValid: boolean; errors: ValidationErrors; parsedAmount: number } => {
  const errors: ValidationErrors = {};

  // Title validation
  const trimmedTitle = values.title.trim();
  if (!trimmedTitle) {
    errors.title = 'Title or merchant name is required.';
  } else if (trimmedTitle.length < 2) {
    errors.title = 'Title must be at least 2 characters.';
  }

  // Amount validation
  const cleanedAmountStr = values.amount.trim();
  const parsedAmount = parseFloat(cleanedAmountStr);
  if (!cleanedAmountStr) {
    errors.amount = 'Amount is required.';
  } else if (isNaN(parsedAmount) || parsedAmount <= 0) {
    errors.amount = 'Enter a valid positive amount greater than 0.';
  } else if (parsedAmount > 1000000000) {
    errors.amount = 'Amount cannot exceed ₹1,00,00,00,000.';
  }

  // Type validation
  if (values.type !== 'EXPENSE' && values.type !== 'INCOME') {
    errors.type = "Transaction type must be 'Expense' or 'Income'.";
  }

  // Category validation
  if (!values.category || !values.category.trim()) {
    errors.category = 'Please select a category.';
  }

  // Date validation
  if (!values.date || isNaN(values.date.getTime())) {
    errors.date = 'Please provide a valid date.';
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    parsedAmount: isNaN(parsedAmount) ? 0 : parsedAmount,
  };
};
