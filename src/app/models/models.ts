export type TxnType = 'income' | 'expense';

export interface Transaction {
  id: string;
  date: string; // ISO yyyy-mm-dd
  description: string;
  type: TxnType;
  category: string;
  amount: number;
}

export interface Category {
  id: string;
  label: string;
  color: string; // CSS custom property name, e.g. --series-1
}

export type RangeKey = '30' | '90' | 'ytd' | 'all';

export type Theme = 'auto' | 'light' | 'dark';

export const CATEGORIES: Category[] = [
  { id: 'housing', label: 'Housing', color: '--series-1' },
  { id: 'food', label: 'Food & Dining', color: '--series-2' },
  { id: 'transport', label: 'Transportation', color: '--series-3' },
  { id: 'shopping', label: 'Shopping', color: '--series-4' },
  { id: 'entertainment', label: 'Entertainment', color: '--series-5' },
  { id: 'health', label: 'Health', color: '--series-6' },
  { id: 'bills', label: 'Bills & Utilities', color: '--series-7' },
  { id: 'other', label: 'Other', color: '--series-8' },
];

export const INCOME_CATEGORIES: Category[] = [
  { id: 'salary', label: 'Salary', color: '--good' },
  { id: 'freelance', label: 'Freelance', color: '--good' },
  { id: 'investment', label: 'Investments', color: '--good' },
  { id: 'other-inc', label: 'Other income', color: '--good' },
];

const CAT_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));
const INC_BY_ID = new Map(INCOME_CATEGORIES.map((c) => [c.id, c]));

export function categoryLabel(id: string): string {
  return CAT_BY_ID.get(id)?.label || INC_BY_ID.get(id)?.label || id;
}

export function categoryColorVar(id: string, type: TxnType): string {
  if (type === 'income') return '--good';
  return CAT_BY_ID.get(id)?.color || '--series-8';
}
