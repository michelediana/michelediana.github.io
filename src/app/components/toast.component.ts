import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (toast.message(); as msg) {
      <div class="toast" role="status" aria-live="polite">{{ msg }}</div>
    }
  `,
})
export class ToastComponent {
  protected toast = inject(ToastService);
}
