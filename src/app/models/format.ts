const currencyFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const currencyCompactFmt = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1,
});
const pctFmt = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 });

export function formatCurrency(n: number, compact = false): string {
  return (compact ? currencyCompactFmt : currencyFmt).format(n);
}

export function formatPercent(n: number): string {
  return pctFmt.format(n);
}

export function formatDate(d: string | Date, style: 'short' | 'med' | 'month' = 'short'): string {
  const date = d instanceof Date ? d : new Date(d);
  if (style === 'short') return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (style === 'med') return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function monthKey(d: string | Date): string {
  const date = d instanceof Date ? d : new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function niceMax(value: number): number {
  if (value <= 0) return 10;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const norm = value / magnitude;
  let step: number;
  if (norm <= 1) step = 1;
  else if (norm <= 2) step = 2;
  else if (norm <= 5) step = 5;
  else step = 10;
  return step * magnitude;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
