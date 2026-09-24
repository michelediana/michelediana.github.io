import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DataService } from '../services/data.service';
import { formatCurrency, formatPercent } from '../models/format';
import { cssVar } from '../models/dom';
import { SparklineComponent } from './sparkline.component';

interface KpiTile {
  label: string;
  value: string;
  deltaPct: number | null;
  invert: boolean;
  sparkValues: number[];
  accent: string;
}

function sumTotals(txns: { type: string; amount: number }[]) {
  let income = 0, expense = 0;
  for (const t of txns) { if (t.type === 'income') income += t.amount; else expense += t.amount; }
  return { income, expense };
}

@Component({
  selector: 'app-kpi-row',
  standalone: true,
  imports: [SparklineComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="kpi-row" aria-label="Key figures">
      @for (tile of tiles(); track tile.label) {
        <div class="kpi-tile">
          <div class="kpi-label">{{ tile.label }}</div>
          <div class="kpi-value-row">
            <span class="kpi-value">{{ tile.value }}</span>
            @if (tile.deltaPct === null) {
              <span class="kpi-delta flat">—</span>
            } @else {
              <span class="kpi-delta" [class]="deltaClass(tile)">
                {{ arrow(tile) }} {{ formatPercent(absPct(tile)) }}
              </span>
            }
          </div>
          @if (tile.sparkValues.length > 1) {
            <app-sparkline [values]="tile.sparkValues" [accent]="tile.accent" />
          }
        </div>
      }
    </section>
  `,
})
export class KpiRowComponent {
  private data = inject(DataService);
  protected formatPercent = formatPercent;

  private pct(a: number, b: number, isAll: boolean): number | null {
    if (isAll || b === 0) return null;
    return (a - b) / Math.abs(b);
  }

  readonly tiles = computed<KpiTile[]>(() => {
    const { isAll } = this.data.rangeWindow();
    const cur = sumTotals(this.data.windowTransactions());
    const prev = sumTotals(this.data.prevWindowTransactions());
    const balance = this.data.currentBalance();
    const today = new Date();
    const balance30ago = this.data.balanceAt(new Date(today.getTime() - 30 * 86400000));

    const savingsRate = cur.income > 0 ? (cur.income - cur.expense) / cur.income : 0;
    const prevSavingsRate = prev.income > 0 ? (prev.income - prev.expense) / prev.income : null;

    const balSpark: number[] = [];
    for (let i = 7; i >= 0; i--) balSpark.push(this.data.balanceAt(new Date(today.getTime() - i * 7 * 86400000)));
    const months6 = this.data.monthlyIncomeExpense(6);

    return [
      {
        label: 'Net balance', value: formatCurrency(balance, true),
        deltaPct: isAll ? null : this.pct(balance, balance30ago, false),
        invert: false, sparkValues: balSpark, accent: cssVar('--series-1'),
      },
      {
        label: 'Income', value: formatCurrency(cur.income, true),
        deltaPct: this.pct(cur.income, prev.income, isAll),
        invert: false, sparkValues: months6.map((m) => m.income), accent: cssVar('--series-1'),
      },
      {
        label: 'Expenses', value: formatCurrency(cur.expense, true),
        deltaPct: this.pct(cur.expense, prev.expense, isAll),
        invert: true, sparkValues: months6.map((m) => m.expense), accent: cssVar('--series-2'),
      },
      {
        label: 'Savings rate', value: formatPercent(savingsRate),
        deltaPct: (prevSavingsRate === null || isAll) ? null : savingsRate - prevSavingsRate,
        invert: false, sparkValues: [], accent: cssVar('--series-1'),
      },
    ];
  });

  private rawUp(t: KpiTile): boolean { return (t.deltaPct ?? 0) > 0.001; }
  private rawDown(t: KpiTile): boolean { return (t.deltaPct ?? 0) < -0.001; }

  arrow(t: KpiTile): string { return this.rawUp(t) ? '▲' : this.rawDown(t) ? '▼' : '•'; }

  deltaClass(t: KpiTile): string {
    const up = this.rawUp(t), down = this.rawDown(t);
    if (!up && !down) return 'kpi-delta flat';
    const goodDirection = up ? (t.invert ? 'down' : 'up') : (t.invert ? 'up' : 'down');
    return `kpi-delta ${goodDirection}`;
  }

  absPct(t: KpiTile): number { return Math.abs(t.deltaPct ?? 0); }
}
