import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, output, signal, viewChild } from '@angular/core';
import { DataService } from '../services/data.service';
import { ThemeService } from '../services/theme.service';
import { ToastService } from '../services/toast.service';
import { RangeKey, Transaction } from '../models/models';
import { isoDay, uid } from '../models/format';

const RANGES: { key: RangeKey; label: string }[] = [
  { key: '30', label: '30D' },
  { key: '90', label: '90D' },
  { key: 'ytd', label: 'YTD' },
  { key: 'all', label: 'All' },
];

@Component({
  selector: 'app-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:click)': 'onDocumentClick($event)' },
  template: `
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true">◆</span>
        <span class="brand-name">Finch</span>
      </div>

      <div class="topbar-actions">
        <div class="range-filter" role="group" aria-label="Date range">
          @for (r of ranges; track r.key) {
            <button type="button" class="range-btn" [class.is-active]="data.range() === r.key" (click)="data.range.set(r.key)">{{ r.label }}</button>
          }
        </div>
        <button type="button" class="btn btn-primary" (click)="addTransaction.emit()">+ Add transaction</button>
        <div class="menu">
          <button type="button" class="btn btn-ghost" [attr.aria-expanded]="menuOpen()" aria-haspopup="true" title="More options" (click)="toggleMenu($event)">⋯</button>
          @if (menuOpen()) {
            <div class="menu-panel">
              <button type="button" class="menu-item" (click)="onToggleTheme()">Toggle theme</button>
              <button type="button" class="menu-item" (click)="exportData()">Export data (JSON)</button>
              <label class="menu-item menu-item-file">Import data (JSON)
                <input type="file" accept="application/json" hidden #fileInput (change)="onImport($event)" />
              </label>
              <button type="button" class="menu-item menu-item-danger" (click)="onReset()">Reset sample data</button>
            </div>
          }
        </div>
      </div>
    </header>
  `,
})
export class TopbarComponent {
  protected data = inject(DataService);
  private theme = inject(ThemeService);
  private toast = inject(ToastService);
  private host = inject(ElementRef<HTMLElement>);

  readonly addTransaction = output<void>();
  protected ranges = RANGES;
  readonly menuOpen = signal(false);

  toggleMenu(evt: Event): void {
    evt.stopPropagation();
    this.menuOpen.update((v) => !v);
  }

  onDocumentClick(evt: Event): void {
    if (this.menuOpen() && !this.host.nativeElement.contains(evt.target as Node)) {
      this.menuOpen.set(false);
    }
  }

  onToggleTheme(): void {
    const next = this.theme.toggle();
    this.toast.show(`Theme: ${next}`);
    this.menuOpen.set(false);
  }

  exportData(): void {
    const blob = new Blob(
      [JSON.stringify({ transactions: this.data.transactions(), budgets: this.data.budgets() }, null, 2)],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finch-export-${isoDay(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    this.toast.show('Exported JSON');
    this.menuOpen.set(false);
  }

  onImport(evt: Event): void {
    const input = evt.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    this.menuOpen.set(false);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!Array.isArray(parsed.transactions)) throw new Error('Invalid file');
        const cleaned: Transaction[] = parsed.transactions
          .filter((t: any) => t && typeof t.amount === 'number' && typeof t.date === 'string')
          .map((t: any) => ({
            id: typeof t.id === 'string' ? t.id : uid(),
            description: String(t.description || 'Untitled').slice(0, 200),
            amount: Math.abs(Number(t.amount)) || 0,
            type: t.type === 'income' ? 'income' : 'expense',
            category: String(t.category || 'other'),
            date: String(t.date).slice(0, 10),
          }));
        const budgets = parsed.budgets && typeof parsed.budgets === 'object' ? parsed.budgets : {};
        this.data.importData(cleaned, budgets);
        this.toast.show(`Imported ${cleaned.length} transactions`);
      } catch {
        this.toast.show('Import failed — invalid JSON file');
      }
    };
    reader.readAsText(file);
  }

  onReset(): void {
    this.menuOpen.set(false);
    if (confirm('Reset all data and reload the sample dataset? This cannot be undone.')) {
      this.data.resetToSampleData();
      this.toast.show('Sample data restored');
    }
  }
}
