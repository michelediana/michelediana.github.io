import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DataService, MonthBucket } from '../services/data.service';
import { clamp, formatCurrency, niceMax } from '../models/format';
import { cssVar } from '../models/dom';

interface BarGeom { cx: number; label: string; incPath: string; expPath: string; income: number; expense: number; monthLong: string; }

function roundedTopRectPath(x: number, y: number, w: number, h: number, r: number): string {
  r = Math.min(r, w / 2, Math.max(h, 0));
  if (h <= 0) return `M${x},${y + h} h${w} v0 h${-w} Z`;
  if (h < r) r = h;
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
}

@Component({
  selector: 'app-income-expense-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card chart-card">
      <div class="card-head">
        <div>
          <h2>Income vs expenses</h2>
          <p class="card-sub">By month</p>
        </div>
        <div class="legend">
          <span class="legend-item"><span class="legend-swatch" [style.background]="incomeColor"></span>Income</span>
          <span class="legend-item"><span class="legend-swatch" [style.background]="expenseColor"></span>Expenses</span>
        </div>
      </div>
      <div class="chart-wrap" #wrap>
        <svg class="chart" viewBox="0 0 600 220" preserveAspectRatio="none" width="100%" height="220">
          @for (g of gridlines(); track g.v) {
            <line [class]="g.baseline ? 'chart-baseline' : 'chart-gridline'" [attr.x1]="padL" [attr.x2]="600 - padR" [attr.y1]="g.y" [attr.y2]="g.y" />
            <text class="chart-axis-label" [attr.x]="padL - 8" [attr.y]="g.y + 3" text-anchor="end">{{ formatCurrency(g.v, true) }}</text>
          }
          @for (b of bars(); track b.label; let i = $index) {
            <path class="bar-mark" [class.is-hovered]="hoverIdx() === i" [attr.d]="b.incPath" [attr.fill]="incomeColor" />
            <path class="bar-mark" [class.is-hovered]="hoverIdx() === i" [attr.d]="b.expPath" [attr.fill]="expenseColor" />
            <text class="chart-axis-label" [attr.x]="b.cx" y="216" text-anchor="middle">{{ b.label }}</text>
            <rect class="chart-hit" [attr.x]="bandX(i)" [attr.y]="padT" [attr.width]="bandW()" [attr.height]="plotH"
                  tabindex="0"
                  (pointerenter)="hoverIdx.set(i)" (pointerleave)="hoverIdx.set(null)"
                  (pointermove)="onMove($event, i)" (focus)="hoverIdx.set(i)" (blur)="hoverIdx.set(null)" />
          }
        </svg>
        @if (hoverIdx() !== null) {
          <div class="chart-tooltip is-visible" [style.left.px]="tooltipX()" [style.top.px]="tooltipY()">
            <div class="chart-tooltip-title">{{ bars()[hoverIdx()!].monthLong }}</div>
            <div class="chart-tooltip-row">
              <span class="chart-tooltip-key" [style.background]="incomeColor"></span>
              <span class="chart-tooltip-name">Income</span>
              <span class="chart-tooltip-value">{{ formatCurrency(bars()[hoverIdx()!].income) }}</span>
            </div>
            <div class="chart-tooltip-row">
              <span class="chart-tooltip-key" [style.background]="expenseColor"></span>
              <span class="chart-tooltip-name">Expenses</span>
              <span class="chart-tooltip-value">{{ formatCurrency(bars()[hoverIdx()!].expense) }}</span>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class IncomeExpenseChartComponent {
  private data = inject(DataService);

  protected formatCurrency = formatCurrency;
  readonly padL = 46; readonly padR = 14; readonly padT = 16; readonly padB = 24;
  readonly plotH = 220 - this.padT - this.padB;
  readonly incomeColor = cssVar('--series-1');
  readonly expenseColor = cssVar('--series-2');

  readonly hoverIdx = signal<number | null>(null);
  private readonly clientPos = signal({ x: 0, y: 0 });

  private readonly plotW = computed(() => 600 - this.padL - this.padR);

  private readonly months = computed<MonthBucket[]>(() => {
    const range = this.data.range();
    const count = range === '30' ? 3 : range === '90' ? 4 : range === 'ytd' ? new Date().getMonth() + 1 : 12;
    return this.data.monthlyIncomeExpense(clamp(count, 2, 12));
  });

  readonly bandW = computed(() => this.plotW() / this.months().length);
  bandX(i: number): number { return this.padL + this.bandW() * i; }

  private readonly maxV = computed(() => niceMax(Math.max(...this.months().map((m) => Math.max(m.income, m.expense)), 1)));

  private yAt(v: number): number { return this.padT + this.plotH - (v / this.maxV()) * this.plotH; }

  readonly gridlines = computed(() => {
    const steps = 4;
    const out: { v: number; y: number; baseline: boolean }[] = [];
    for (let i = 0; i <= steps; i++) {
      const v = (this.maxV() * i) / steps;
      out.push({ v, y: this.yAt(v), baseline: i === 0 });
    }
    return out;
  });

  readonly bars = computed<BarGeom[]>(() => {
    const months = this.months();
    const bandW = this.bandW();
    const barW = clamp(bandW * 0.28, 6, 24);
    const gap = 2;
    return months.map((m, i) => {
      const cx = this.padL + bandW * i + bandW / 2;
      const incX = cx - gap / 2 - barW;
      const expX = cx + gap / 2;
      const incH = (m.income / this.maxV()) * this.plotH;
      const expH = (m.expense / this.maxV()) * this.plotH;
      return {
        cx, label: m.label, income: m.income, expense: m.expense,
        monthLong: new Date(m.key + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        incPath: roundedTopRectPath(incX, this.yAt(m.income), barW, incH, 4),
        expPath: roundedTopRectPath(expX, this.yAt(m.expense), barW, expH, 4),
      };
    });
  });

  readonly tooltipX = computed(() => {
    const { x } = this.clientPos();
    return clamp(x, 60, 540);
  });
  readonly tooltipY = computed(() => {
    const { y } = this.clientPos();
    return Math.max(y, 70);
  });

  onMove(evt: PointerEvent, i: number): void {
    const wrap = (evt.currentTarget as SVGRectElement).closest('.chart-wrap') as HTMLElement;
    const rect = wrap.getBoundingClientRect();
    this.clientPos.set({ x: evt.clientX - rect.left, y: evt.clientY - rect.top });
    this.hoverIdx.set(i);
  }
}
