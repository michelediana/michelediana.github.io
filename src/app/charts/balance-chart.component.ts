import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { DataService } from '../services/data.service';
import { clamp, formatCurrency, formatDate, niceMax } from '../models/format';
import { cssVar } from '../models/dom';

interface Point { date: string; value: number; }

@Component({
  selector: 'app-balance-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card chart-card">
      <div class="card-head">
        <div>
          <h2>Balance over time</h2>
          <p class="card-sub">{{ subLabel() }}</p>
        </div>
      </div>
      <div class="chart-wrap" #wrap>
        <svg class="chart" viewBox="0 0 600 220" preserveAspectRatio="none" width="100%" height="220">
          @for (g of gridlines(); track g.v) {
            <line [class]="g.baseline ? 'chart-baseline' : 'chart-gridline'" [attr.x1]="padL" [attr.x2]="600 - padR" [attr.y1]="g.y" [attr.y2]="g.y" />
            <text class="chart-axis-label" [attr.x]="padL - 8" [attr.y]="g.y + 3" text-anchor="end">{{ formatCurrency(g.v, true) }}</text>
          }
          @for (t of xTicks(); track t.label) {
            <text class="chart-axis-label" [attr.x]="t.x" y="216" [attr.text-anchor]="t.anchor">{{ t.label }}</text>
          }
          <path [attr.d]="areaPath()" [attr.fill]="seriesColor" opacity="0.1" stroke="none" />
          <path [attr.d]="linePath()" fill="none" [attr.stroke]="seriesColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
          <circle [attr.cx]="endPoint().x" [attr.cy]="endPoint().y" r="4" [attr.fill]="seriesColor" [attr.stroke]="surfaceColor" stroke-width="2" />
          <text class="chart-value-label" [attr.x]="endLabelX()" [attr.y]="endPoint().y - 10" [attr.text-anchor]="endLabelAnchor()">
            {{ formatCurrency(points()[points().length - 1].value, true) }}
          </text>
          @if (hoverIndex(); as hi) {
            <line class="chart-crosshair" [attr.x1]="xAt(hi - 1)" [attr.x2]="xAt(hi - 1)" [attr.y1]="padT" [attr.y2]="220 - padB" />
            <circle [attr.cx]="xAt(hi - 1)" [attr.cy]="yAt(points()[hi - 1].value)" r="4.5" [attr.fill]="seriesColor" [attr.stroke]="surfaceColor" stroke-width="2" />
          }
          <rect class="chart-hit" [attr.x]="padL" [attr.y]="padT" [attr.width]="plotW()" [attr.height]="plotH" tabindex="0"
                (pointermove)="onMove($event)" (pointerleave)="hoverIndex.set(null)" (pointerdown)="onMove($event)"
                (focus)="hoverIndex.set(points().length)" (blur)="hoverIndex.set(null)" />
        </svg>
        @if (hoverIndex(); as hi) {
          <div class="chart-tooltip is-visible" [style.left.px]="tooltipX()" [style.top.px]="tooltipY()">
            <div class="chart-tooltip-title">{{ formatDate(points()[hi - 1].date, 'med') }}</div>
            <div class="chart-tooltip-row">
              <span class="chart-tooltip-key" [style.background]="seriesColor"></span>
              <span class="chart-tooltip-name">Balance</span>
              <span class="chart-tooltip-value">{{ formatCurrency(points()[hi - 1].value) }}</span>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class BalanceChartComponent {
  private data = inject(DataService);
  private wrapRef = viewChild.required<ElementRef<HTMLDivElement>>('wrap');

  protected formatCurrency = formatCurrency;
  protected formatDate = formatDate;

  readonly padL = 46; readonly padR = 14; readonly padT = 16; readonly padB = 24;
  readonly seriesColor = cssVar('--series-1');
  readonly surfaceColor = cssVar('--surface-1');

  readonly hoverIndex = signal<number | null>(null);
  private readonly clientPos = signal({ x: 0, y: 0 });

  readonly subLabel = computed(() => {
    const { start, end } = this.data.rangeWindow();
    return `${formatDate(start, 'med')} – ${formatDate(end, 'med')}`;
  });

  readonly points = computed<Point[]>(() => {
    const { start, end } = this.data.rangeWindow();
    const startVal = this.data.balanceAt(start);
    const inWin = this.data.balanceSeries().filter((p) => {
      const t = new Date(p.date).getTime();
      return t >= start.getTime() && t <= end.getTime() + 86399999;
    });
    const pts: Point[] = [{ date: start.toISOString().slice(0, 10), value: startVal }, ...inWin];
    if (pts.length < 2) pts.push({ date: end.toISOString().slice(0, 10), value: startVal });
    return pts;
  });

  readonly plotW = computed(() => 600 - this.padL - this.padR);
  readonly plotH = 220 - this.padT - this.padB;

  private readonly minV = computed(() => Math.min(0, ...this.points().map((p) => p.value)));
  private readonly maxV = computed(() => niceMax(Math.max(...this.points().map((p) => p.value), 1)));
  private readonly spanV = computed(() => this.maxV() - this.minV() || 1);

  xAt(i: number): number {
    const n = this.points().length;
    return this.padL + (i / (n - 1)) * this.plotW();
  }
  yAt(v: number): number {
    return this.padT + this.plotH - ((v - this.minV()) / this.spanV()) * this.plotH;
  }

  readonly gridlines = computed(() => {
    const steps = 4;
    const out: { v: number; y: number; baseline: boolean }[] = [];
    for (let i = 0; i <= steps; i++) {
      const v = this.minV() + (this.spanV() * i) / steps;
      out.push({ v, y: this.yAt(v), baseline: i === 0 && this.minV() === 0 });
    }
    return out;
  });

  readonly xTicks = computed(() => {
    const pts = this.points();
    const idxs = [0, Math.floor((pts.length - 1) / 2), pts.length - 1];
    return idxs.map((i) => ({
      x: this.xAt(i),
      label: formatDate(pts[i].date, 'short'),
      anchor: i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle',
    }));
  });

  readonly linePath = computed(() => {
    const pts = this.points();
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${this.xAt(i)},${this.yAt(p.value)}`).join(' ');
  });

  readonly areaPath = computed(() => {
    const pts = this.points();
    let d = `M${this.xAt(0)},${this.yAt(pts[0].value)}`;
    pts.forEach((p, i) => { if (i > 0) d += ` L${this.xAt(i)},${this.yAt(p.value)}`; });
    d += ` L${this.xAt(pts.length - 1)},${this.yAt(this.minV())} L${this.xAt(0)},${this.yAt(this.minV())} Z`;
    return d;
  });

  readonly endPoint = computed(() => {
    const pts = this.points();
    return { x: this.xAt(pts.length - 1), y: this.yAt(pts[pts.length - 1].value) };
  });
  readonly endLabelX = computed(() => clamp(this.endPoint().x, this.padL, 600 - this.padR - 60));
  readonly endLabelAnchor = computed(() => (this.endPoint().x > 600 - this.padR - 40 ? 'end' : 'middle'));

  readonly tooltipX = computed(() => {
    const { x } = this.clientPos();
    const rect = this.wrapRef().nativeElement.getBoundingClientRect();
    return clamp(x - rect.left, 60, rect.width - 60);
  });
  readonly tooltipY = computed(() => {
    const { y } = this.clientPos();
    const rect = this.wrapRef().nativeElement.getBoundingClientRect();
    return Math.max(y - rect.top, 70);
  });

  onMove(evt: PointerEvent): void {
    this.clientPos.set({ x: evt.clientX, y: evt.clientY });
    const svg = (evt.currentTarget as SVGRectElement).ownerSVGElement!;
    const rect = svg.getBoundingClientRect();
    const relX = ((evt.clientX - rect.left) / rect.width) * 600;
    const n = this.points().length;
    const i = clamp(Math.round(((relX - this.padL) / this.plotW()) * (n - 1)), 0, n - 1);
    this.hoverIndex.set(i + 1);
  }
}
