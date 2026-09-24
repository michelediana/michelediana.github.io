import { Injectable, computed, effect, signal } from '@angular/core';
import { CATEGORIES, RangeKey, Transaction } from '../models/models';
import { isoDay, monthKey, niceMax } from '../models/format';
import { generateSampleData } from '../models/sample-data';

const STORAGE_KEY = 'finch.v1';

export interface RangeWindow {
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
  isAll: boolean;
}

export interface MonthBucket {
  key: string;
  label: string;
  income: number;
  expense: number;
}

export interface CategoryAmount {
  id: string;
  label: string;
  color: string;
  amount: number;
}

export interface SortState {
  key: 'date' | 'description' | 'category' | 'amount';
  dir: 'asc' | 'desc';
}

export interface TxnFilters {
  search: string;
  category: string;
  type: 'all' | 'income' | 'expense';
}

function todayDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function inWindow(dateStr: string, start: Date, end: Date): boolean {
  const t = new Date(dateStr).getTime();
  return t >= start.getTime() && t <= end.getTime() + 86399999;
}

@Injectable({ providedIn: 'root' })
export class DataService {
  readonly transactions = signal<Transaction[]>([]);
  readonly budgets = signal<Record<string, number>>({});
  readonly range = signal<RangeKey>('all');
  readonly sort = signal<SortState>({ key: 'date', dir: 'desc' });
  readonly filters = signal<TxnFilters>({ search: '', category: 'all', type: 'all' });

  private hydrated = false;

  constructor() {
    if (!this.loadFromStorage() || this.transactions().length === 0) {
      const sample = generateSampleData();
      this.transactions.set(sample.transactions);
      this.budgets.set(sample.budgets);
    }
    this.hydrated = true;

    effect(() => {
      const payload = JSON.stringify({ transactions: this.transactions(), budgets: this.budgets() });
      if (this.hydrated) localStorage.setItem(STORAGE_KEY, payload);
    });
  }

  private loadFromStorage(): boolean {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      this.transactions.set(Array.isArray(parsed.transactions) ? parsed.transactions : []);
      this.budgets.set(parsed.budgets && typeof parsed.budgets === 'object' ? parsed.budgets : {});
      return true;
    } catch {
      return false;
    }
  }

  resetToSampleData(): void {
    const sample = generateSampleData();
    this.transactions.set(sample.transactions);
    this.budgets.set(sample.budgets);
  }

  upsertTransaction(txn: Transaction): void {
    const list = this.transactions();
    const idx = list.findIndex((t) => t.id === txn.id);
    if (idx >= 0) {
      const copy = list.slice();
      copy[idx] = txn;
      this.transactions.set(copy);
    } else {
      this.transactions.set([...list, txn]);
    }
  }

  deleteTransaction(id: string): void {
    this.transactions.set(this.transactions().filter((t) => t.id !== id));
  }

  setBudgets(next: Record<string, number>): void {
    this.budgets.set(next);
  }

  importData(transactions: Transaction[], budgets: Record<string, number>): void {
    this.transactions.set(transactions);
    this.budgets.set(budgets);
  }

  /* ---------------- derived selectors ---------------- */

  readonly rangeWindow = computed<RangeWindow>(() => {
    const end = todayDate();
    const range = this.range();
    let start: Date;
    if (range === '30') start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 29);
    else if (range === '90') start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 89);
    else if (range === 'ytd') start = new Date(end.getFullYear(), 0, 1);
    else {
      const dates = this.transactions().map((t) => t.date).sort();
      start = dates.length ? new Date(dates[0]) : new Date(end.getFullYear(), end.getMonth() - 12, 1);
    }
    const spanMs = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 86400000);
    const prevStart = new Date(prevEnd.getTime() - spanMs);
    return { start, end, prevStart, prevEnd, isAll: range === 'all' };
  });

  readonly balanceSeries = computed<{ date: string; value: number }[]>(() => {
    const sorted = [...this.transactions()].sort((a, b) => a.date.localeCompare(b.date));
    let running = 0;
    const byDay = new Map<string, number>();
    for (const t of sorted) {
      running += t.type === 'income' ? t.amount : -t.amount;
      byDay.set(t.date, running);
    }
    return Array.from(byDay.entries()).map(([date, value]) => ({ date, value }));
  });

  balanceAt(dateObj: Date): number {
    const target = isoDay(dateObj);
    let val = 0;
    for (const p of this.balanceSeries()) {
      if (p.date <= target) val = p.value; else break;
    }
    return val;
  }

  readonly currentBalance = computed<number>(() => {
    const series = this.balanceSeries();
    return series.length ? series[series.length - 1].value : 0;
  });

  readonly windowTransactions = computed<Transaction[]>(() => {
    const { start, end } = this.rangeWindow();
    return this.transactions().filter((t) => inWindow(t.date, start, end));
  });

  readonly prevWindowTransactions = computed<Transaction[]>(() => {
    const { prevStart, prevEnd, isAll } = this.rangeWindow();
    if (isAll) return [];
    return this.transactions().filter((t) => inWindow(t.date, prevStart, prevEnd));
  });

  monthlyIncomeExpense(monthsCount: number): MonthBucket[] {
    const end = todayDate();
    const months: MonthBucket[] = [];
    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
      months.push({
        key: monthKey(d),
        label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        income: 0,
        expense: 0,
      });
    }
    const idx = new Map(months.map((m, i) => [m.key, i]));
    for (const t of this.transactions()) {
      const k = monthKey(t.date);
      if (idx.has(k)) {
        const bucket = months[idx.get(k)!];
        if (t.type === 'income') bucket.income += t.amount; else bucket.expense += t.amount;
      }
    }
    return months;
  }

  categoryBreakdown(txns: Transaction[]): CategoryAmount[] {
    const sums = new Map<string, number>();
    for (const t of txns) {
      if (t.type !== 'expense') continue;
      sums.set(t.category, (sums.get(t.category) || 0) + t.amount);
    }
    return CATEGORIES
      .map((c) => ({ id: c.id, label: c.label, color: c.color, amount: sums.get(c.id) || 0 }))
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }

  readonly currentMonthSpend = computed<Map<string, number>>(() => {
    const k = monthKey(new Date());
    const sums = new Map<string, number>();
    for (const t of this.transactions()) {
      if (t.type !== 'expense' || monthKey(t.date) !== k) continue;
      sums.set(t.category, (sums.get(t.category) || 0) + t.amount);
    }
    return sums;
  });

  readonly filteredSortedTransactions = computed<Transaction[]>(() => {
    const { search, category, type } = this.filters();
    let list = this.transactions().filter((t) => {
      if (type !== 'all' && t.type !== type) return false;
      if (category !== 'all' && t.category !== category) return false;
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    const { key, dir } = this.sort();
    const mult = dir === 'asc' ? 1 : -1;
    list = list.slice().sort((a, b) => {
      if (key === 'amount') return (a.amount - b.amount) * mult;
      if (key === 'category') return a.category.localeCompare(b.category) * mult;
      if (key === 'description') return a.description.localeCompare(b.description) * mult;
      return a.date.localeCompare(b.date) * mult;
    });
    return list;
  });
}

export { niceMax };
