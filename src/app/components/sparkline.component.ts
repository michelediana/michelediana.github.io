import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { cssVar } from '../models/dom';

@Component({
  selector: 'app-sparkline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg class="kpi-spark" viewBox="0 0 120 30" preserveAspectRatio="none" aria-hidden="true">
      <path [attr.d]="linePath()" fill="none" [attr.stroke]="mutedColor" stroke-width="1.5"
            stroke-linejoin="round" stroke-linecap="round" opacity="0.55" />
      <circle [attr.cx]="lastPoint().x" [attr.cy]="lastPoint().y" r="2.5" [attr.fill]="accent()" />
    </svg>
  `,
})
export class SparklineComponent {
  readonly values = input<number[]>([]);
  readonly accent = input<string>('#2a78d6');

  readonly mutedColor = cssVar('--text-muted') || '#898781';

  private readonly VW = 120;
  private readonly VH = 30;

  private geometry = computed(() => {
    const values = this.values();
    if (values.length < 2) return { points: [] as { x: number; y: number }[] };
    const min = Math.min(...values), max = Math.max(...values);
    const span = max - min || 1;
    const points = values.map((v, i) => ({
      x: (i / (values.length - 1)) * this.VW,
      y: this.VH - ((v - min) / span) * (this.VH - 4) - 2,
    }));
    return { points };
  });

  readonly linePath = computed(() => {
    const { points } = this.geometry();
    if (!points.length) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  });

  readonly lastPoint = computed(() => {
    const { points } = this.geometry();
    return points.length ? points[points.length - 1] : { x: 0, y: 0 };
  });
}
