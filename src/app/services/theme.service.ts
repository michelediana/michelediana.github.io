import { Injectable, signal } from '@angular/core';
import { Theme } from '../models/models';

const THEME_KEY = 'finch.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>((localStorage.getItem(THEME_KEY) as Theme) || 'auto');

  constructor() {
    this.apply();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.theme() === 'auto') this.apply();
    });
  }

  toggle(): Theme {
    const current = this.theme();
    const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let next: Theme;
    if (current === 'auto') next = sysDark ? 'light' : 'dark';
    else if (current === 'light') next = 'dark';
    else next = 'auto';
    this.theme.set(next);
    localStorage.setItem(THEME_KEY, next);
    this.apply();
    return next;
  }

  private apply(): void {
    const theme = this.theme();
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
  }
}
