import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService, SortState } from '../services/data.service';
import { CATEGORIES, INCOME_CATEGORIES, Transaction, categoryColorVar, categoryLabel } from '../models/models';
import { formatCurrency, formatDate } from '../models/format';
import { cssVar } from '../models/dom';

@Component({
  selector: 'app-transactions-table',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card">
      <div class="card-head">
        <div>
          <h2>Transactions</h2>
          <p class="card-sub">{{ data.transactions().length }} transaction{{ data.transactions().length === 1 ? '' : 's' }} total</p>
        </div>
        <div class="txn-controls">
          <input type="search" placeholder="Search description…" aria-label="Search transactions"
                 [ngModel]="data.filters().search" (ngModelChange)="setSearch($event)" />
          <select aria-label="Filter by category" [ngModel]="data.filters().category" (ngModelChange)="setFilterCategory($event)">
            <option value="all">All categories</option>
            <optgroup label="Income">
              @for (c of incomeCategories; track c.id) { <option [value]="c.id">{{ c.label }}</option> }
            </optgroup>
            <optgroup label="Expense">
              @for (c of expenseCategories; track c.id) { <option [value]="c.id">{{ c.label }}</option> }
            </optgroup>
          </select>
          <select aria-label="Filter by type" [ngModel]="data.filters().type" (ngModelChange)="setFilterType($event)">
            <option value="all">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th [class.is-sorted]="sort().key === 'date'" [attr.aria-sort]="ariaSort('date')" (click)="toggleSort('date')">Date</th>
              <th [class.is-sorted]="sort().key === 'description'" [attr.aria-sort]="ariaSort('description')" (click)="toggleSort('description')">Description</th>
              <th [class.is-sorted]="sort().key === 'category'" [attr.aria-sort]="ariaSort('category')" (click)="toggleSort('category')">Category</th>
              <th class="num" [class.is-sorted]="sort().key === 'amount'" [attr.aria-sort]="ariaSort('amount')" (click)="toggleSort('amount')">Amount</th>
              <th class="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            @for (t of rows(); track t.id) {
              <tr>
                <td>{{ formatDate(t.date, 'med') }}</td>
                <td>{{ t.description }}</td>
                <td>
                  <span class="txn-cat-chip">
                    <span class="txn-cat-dot" [style.background]="cssVar(categoryColorVar(t.category, t.type))"></span>
                    {{ categoryLabel(t.category) }}
                  </span>
                </td>
                <td class="num">
                  <span class="txn-amount" [class.income]="t.type === 'income'" [class.expense]="t.type === 'expense'">
                    {{ t.type === 'income' ? '+' : '−' }}{{ formatCurrency(t.amount) }}
                  </span>
                </td>
                <td class="col-actions">
                  <button type="button" class="row-edit-btn" (click)="editRequested.emit(t)">Edit</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
        @if (rows().length === 0) {
          <p class="empty-state">No transactions match your filters.</p>
        }
      </div>
    </section>
  `,
})
export class TransactionsTableComponent {
  protected data = inject(DataService);
  readonly editRequested = output<Transaction>();

  protected expenseCategories = CATEGORIES;
  protected incomeCategories = INCOME_CATEGORIES;
  protected formatCurrency = formatCurrency;
  protected formatDate = formatDate;
  protected categoryLabel = categoryLabel;
  protected categoryColorVar = categoryColorVar;
  protected cssVar = cssVar;

  readonly rows = computed(() => this.data.filteredSortedTransactions());
  readonly sort = computed<SortState>(() => this.data.sort());

  setSearch(v: string): void { this.data.filters.update((f) => ({ ...f, search: v })); }
  setFilterCategory(v: string): void { this.data.filters.update((f) => ({ ...f, category: v })); }
  setFilterType(v: 'all' | 'income' | 'expense'): void { this.data.filters.update((f) => ({ ...f, type: v })); }

  toggleSort(key: SortState['key']): void {
    const current = this.sort();
    if (current.key === key) {
      this.data.sort.set({ key, dir: current.dir === 'asc' ? 'desc' : 'asc' });
    } else {
      this.data.sort.set({ key, dir: key === 'date' ? 'desc' : 'asc' });
    }
  }

  ariaSort(key: SortState['key']): 'ascending' | 'descending' | null {
    if (this.sort().key !== key) return null;
    return this.sort().dir === 'asc' ? 'ascending' : 'descending';
  }
}
