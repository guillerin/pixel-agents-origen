import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminApiService } from '../../core/services/admin-api.service';
import { WebSocketService } from '../../core/services/websocket.service';
import type { CoinsUpdateEvent } from '../../core/services/websocket.service';
import type { AdminStats } from '../../shared/models/api.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styles: [`
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 24px; }
    .stat-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; padding: 24px; }
    .stat-value { font-size: 2rem; font-weight: 700; color: var(--color-accent-light); }
    .stat-label { color: var(--color-text-muted); margin-top: 4px; }
    h1 { color: var(--color-text); }
    .loading { color: var(--color-text-muted); margin-top: 24px; display: flex; align-items: center; gap: 8px; }
    .spinner { width: 16px; height: 16px; border: 2px solid var(--color-border); border-top-color: var(--color-accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error-banner { background: var(--color-error-bg, #2d1b1b); border: 1px solid var(--color-error, #e74c3c); color: var(--color-error, #e74c3c); padding: 12px 16px; border-radius: 6px; margin-top: 16px; display: flex; align-items: center; justify-content: space-between; }
    .error-banner button { background: transparent; color: var(--color-error, #e74c3c); border: 1px solid var(--color-error, #e74c3c); padding: 4px 12px; border-radius: 4px; cursor: pointer; }
    .live-section { margin-top: 24px; }
    .live-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
    .live-dot { width: 8px; height: 8px; border-radius: 50%; }
    .live-dot.connected { background: var(--color-success, #2ecc71); animation: pulse 2s infinite; }
    .live-dot.disconnected { background: var(--color-error, #e74c3c); }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .live-label { color: var(--color-text-muted); font-size: 0.85rem; }
    .online-users { display: flex; flex-wrap: wrap; gap: 8px; }
    .online-tag { background: var(--color-surface); border: 1px solid var(--color-border); padding: 4px 10px; border-radius: 99px; font-size: 0.8rem; color: var(--color-text); }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  private api = inject(AdminApiService);
  ws = inject(WebSocketService);
  stats = signal<AdminStats | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  private unsubCoins: (() => void) | null = null;

  ngOnInit() {
    this.loadStats();
    this.ws.connect();
    this.unsubCoins = this.ws.on('economy:coinsUpdate', (data) => {
      const e = data as CoinsUpdateEvent;
      this.stats.update(s => {
        if (!s) return s;
        return { ...s, totalCoinsEarned: s.totalCoinsEarned + (e.totalEarned ?? 0) };
      });
    });
  }

  ngOnDestroy() {
    this.unsubCoins?.();
  }

  loadStats() {
    this.loading.set(true);
    this.error.set(null);
    this.api.getStats().subscribe({
      next: (s) => {
        this.stats.set(s);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load dashboard stats');
        this.loading.set(false);
      },
    });
  }
}
