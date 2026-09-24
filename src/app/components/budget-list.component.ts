import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { DataService } from '../services/data.service';
import { CATEGORIES } from '../models/models';
import { clamp, formatCurrency, formatPercent } from '../models/format';
import { cssVar } from '../models/dom';

interface BudgetRow {
  id: string; label: string; color: string; budget: number; spent: number; ratio: number;
}

@Component({
  selector: 'app-budget-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <div class="card-head">
        <div>
          <h2>Monthly budgets</h2>
          <p class="card-sub">Current calendar month</p>
        </div>
        <button type="button" class="btn btn-ghost btn-sm" (click)="editRequested.emit()">Edit</button>
      </div>
      @if (rows().length === 0) {
        <p class="budget-empty">No budgets set yet. Click Edit to set monthly limits per category.</p>
      } @else {
        @for (r of rows(); track r.id) {
          <div class="budget-row">
            <div class="budget-row-head">
              <div class="budget-cat">
                <span class="budget-dot" [style.background]="cssVar(r.color)"></span>{{ r.label }}
              </div>
              <div class="budget-figures">
                <strong>{{ formatCurrency(r.spent) }}</strong> of {{ formatCurrency(r.budget) }}
              </div>
            </div>
            <div class="meter-track" [style.background]="cssVar('--grid')">
              <div class="meter-fill" [style.width.%]="clamp(r.ratio * 100, 0, 100)" [style.background]="meterColor(r)"></div>
            </div>
            @if (r.ratio >= 1) {
              <p class="budget-status is-critical">Over budget by {{ formatCurrency(r.spent - r.budget) }}</p>
            } @else if (r.ratio >= 0.8) {
              <p class="budget-status is-warning">{{ formatPercent(r.ratio) }} of budget used</p>
            }
          </div>
        }
      }
    </div>
  `,
})
export class BudgetListComponent {
  private data = inject(DataService);
  readonly editRequested = output<void>();

  protected formatCurrency = formatCurrency;
  protected formatPercent = formatPercent;
  protected cssVar = cssVar;
  protected clamp = clamp;

  readonly rows = computed<BudgetRow[]>(() => {
    const spend = this.data.currentMonthSpend();
    const budgets = this.data.budgets();
    return CATEGORIES
      .map((c) => {
        const budget = Number(budgets[c.id]) || 0;
        const spent = spend.get(c.id) || 0;
        return { id: c.id, label: c.label, color: c.color, budget, spent, ratio: budget > 0 ? spent / budget : 0 };
      })
      .filter((r) => r.budget > 0)
      .sort((a, b) => b.ratio - a.ratio);
  });

  meterColor(r: BudgetRow): string {
    if (r.ratio >= 1) return cssVar('--critical');
    if (r.ratio >= 0.8) return cssVar('--warning');
    return cssVar(r.color);
  }
}
