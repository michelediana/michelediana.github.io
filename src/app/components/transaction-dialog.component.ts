import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DataService } from '../services/data.service';
import { ToastService } from '../services/toast.service';
import { CATEGORIES, INCOME_CATEGORIES, Transaction, TxnType } from '../models/models';
import { isoDay, uid } from '../models/format';

@Component({
  selector: 'app-transaction-dialog',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dialogEl class="dialog">
      <form [formGroup]="form" (ngSubmit)="save()">
        <h2>{{ editingId() ? 'Edit transaction' : 'Add transaction' }}</h2>
        <label class="field">Description
          <input type="text" formControlName="description" required maxlength="80" placeholder="e.g. Groceries" />
        </label>
        <div class="form-row">
          <label class="field">Amount
            <input type="number" formControlName="amount" step="0.01" min="0.01" required placeholder="0.00" />
          </label>
          <label class="field">Type
            <select formControlName="type">
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </label>
        </div>
        <div class="form-row">
          <label class="field">Category
            <select formControlName="category">
              <optgroup label="Income" [style.display]="type() === 'income' ? '' : 'none'">
                @for (c of incomeCategories; track c.id) { <option [value]="c.id">{{ c.label }}</option> }
              </optgroup>
              <optgroup label="Expense" [style.display]="type() === 'expense' ? '' : 'none'">
                @for (c of expenseCategories; track c.id) { <option [value]="c.id">{{ c.label }}</option> }
              </optgroup>
            </select>
          </label>
          <label class="field">Date
            <input type="date" formControlName="date" required />
          </label>
        </div>
        <div class="dialog-actions">
          @if (editingId()) {
            <button type="button" class="btn btn-ghost menu-item-danger" (click)="delete()">Delete</button>
          }
          <span class="spacer"></span>
          <button type="button" class="btn btn-ghost" (click)="close()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    </dialog>
  `,
})
export class TransactionDialogComponent {
  private data = inject(DataService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  private dialogEl = viewChild.required<ElementRef<HTMLDialogElement>>('dialogEl');

  protected expenseCategories = CATEGORIES;
  protected incomeCategories = INCOME_CATEGORIES;

  readonly editingId = signal<string | null>(null);

  form = this.fb.group({
    description: this.fb.control('', [Validators.required, Validators.maxLength(80)]),
    amount: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    type: this.fb.control<TxnType>('expense', { nonNullable: true }),
    category: this.fb.control('housing', { nonNullable: true }),
    date: this.fb.control(isoDay(new Date()), { nonNullable: true }),
  });

  readonly type = computed(() => this.form.controls.type.value ?? 'expense');

  constructor() {
    this.form.controls.type.valueChanges.subscribe((t) => {
      const isIncome = t === 'income';
      const currentCat = this.form.controls.category.value;
      const stillValid = isIncome
        ? this.incomeCategories.some((c) => c.id === currentCat)
        : this.expenseCategories.some((c) => c.id === currentCat);
      if (!stillValid) {
        this.form.controls.category.setValue(isIncome ? this.incomeCategories[0].id : this.expenseCategories[0].id);
      }
    });
  }

  open(txn: Transaction | null): void {
    this.editingId.set(txn?.id ?? null);
    this.form.reset({
      description: txn?.description ?? '',
      amount: txn?.amount ?? null,
      type: txn?.type ?? 'expense',
      category: txn?.category ?? 'housing',
      date: txn?.date ?? isoDay(new Date()),
    });
    this.dialogEl().nativeElement.showModal();
  }

  close(): void {
    this.dialogEl().nativeElement.close();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const record: Transaction = {
      id: this.editingId() ?? uid(),
      description: (v.description || 'Untitled').trim() || 'Untitled',
      amount: Math.abs(Number(v.amount)) || 0,
      type: v.type,
      category: v.category,
      date: v.date || isoDay(new Date()),
    };
    const wasEditing = !!this.editingId();
    this.data.upsertTransaction(record);
    this.toast.show(wasEditing ? 'Transaction updated' : 'Transaction added');
    this.close();
  }

  delete(): void {
    const id = this.editingId();
    if (!id) return;
    this.data.deleteTransaction(id);
    this.toast.show('Transaction deleted');
    this.close();
  }
}
