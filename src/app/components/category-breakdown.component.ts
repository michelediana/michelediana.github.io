import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DataService } from '../services/data.service';
import { clamp, formatCurrency, formatPercent } from '../models/format';
import { cssVar } from '../models/dom';

@Component({
  selector: 'app-category-breakdown',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <div class="card-head">
        <div>
          <h2>Spending by category</h2>
          <p class="card-sub">{{ subLabel() }}</p>
        </div>
      </div>
      @if (rows().length === 0) {
        <p class="rank-empty">No spending recorded yet.</p>
      } @else {
        @for (c of rows(); track c.id) {
          <div class="rank-row">
            <div class="rank-label" [title]="c.label">{{ c.label }}</div>
            <div class="rank-track">
              <div class="rank-fill" [style.width.%]="widthPct(c.amount)" [style.background]="cssVar(c.color)"></div>
            </div>
            <div class="rank-value" [title]="pctOfTotal(c.amount)">{{ formatCurrency(c.amount) }}</div>
          </div>
        }
      }
    </div>
  `,
})
export class CategoryBreakdownComponent {
  private data = inject(DataService);
  protected formatCurrency = formatCurrency;
  protected cssVar = cssVar;

  readonly rows = computed(() => this.data.categoryBreakdown(this.data.windowTransactions()));
  readonly total = computed(() => this.rows().reduce((s, c) => s + c.amount, 0));
  private readonly max = computed(() => this.rows()[0]?.amount || 1);

  readonly subLabel = computed(() => this.total() > 0 ? `${formatCurrency(this.total())} total spent` : 'No expenses in this period');

  widthPct(amount: number): number { return clamp((amount / this.max()) * 100, 2, 100); }
  pctOfTotal(amount: number): string { return `${formatPercent(amount / this.total())} of total`; }
}
