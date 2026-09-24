import { ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DataService } from '../services/data.service';
import { ToastService } from '../services/toast.service';
import { CATEGORIES } from '../models/models';
import { cssVar } from '../models/dom';

@Component({
  selector: 'app-budget-dialog',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dialogEl class="dialog">
      <form [formGroup]="form" (ngSubmit)="save()">
        <h2>Edit monthly budgets</h2>
        <p class="card-sub">Set a monthly limit per expense category. Leave blank for no budget.</p>
        <div class="budget-fields">
          @for (c of categories; track c.id) {
            <div class="budget-field-row">
              <label [for]="'budget-' + c.id">
                <span class="budget-dot" [style.background]="cssVar(c.color)"></span>{{ c.label }}
              </label>
              <input [id]="'budget-' + c.id" type="number" min="0" step="10" placeholder="0" [formControlName]="c.id" />
            </div>
          }
        </div>
        <div class="dialog-actions">
          <span class="spacer"></span>
          <button type="button" class="btn btn-ghost" (click)="close()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    </dialog>
  `,
})
export class BudgetDialogComponent {
  private data = inject(DataService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  private dialogEl = viewChild.required<ElementRef<HTMLDialogElement>>('dialogEl');

  protected categories = CATEGORIES;
  protected cssVar = cssVar;

  form: FormGroup = this.fb.group(
    Object.fromEntries(CATEGORIES.map((c) => [c.id, this.fb.control<number | null>(null, [Validators.min(0)])])),
  );

  open(): void {
    const budgets = this.data.budgets();
    const patch: Record<string, number | null> = {};
    for (const c of CATEGORIES) patch[c.id] = budgets[c.id] || null;
    this.form.reset(patch);
    this.dialogEl().nativeElement.showModal();
  }

  close(): void {
    this.dialogEl().nativeElement.close();
  }

  save(): void {
    const next: Record<string, number> = {};
    const value = this.form.value as Record<string, number | null>;
    for (const c of CATEGORIES) {
      const v = Number(value[c.id]);
      if (v > 0) next[c.id] = v;
    }
    this.data.setBudgets(next);
    this.toast.show('Budgets saved');
    this.close();
  }
}
