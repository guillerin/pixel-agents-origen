import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminApiService } from '../../core/services/admin-api.service';
import type { LeaderboardEntry } from '../../shared/models/api.models';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './leaderboard.component.html',
  styles: [`
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--color-border); }
    th { color: var(--color-text-muted); font-size: 0.8rem; text-transform: uppercase; }
    .rank { font-weight: 700; color: var(--color-accent-light); }
    .coin { color: var(--color-coin); }
    .loading { color: var(--color-text-muted); margin-top: 16px; display: flex; align-items: center; gap: 8px; }
    .spinner { width: 16px; height: 16px; border: 2px solid var(--color-border); border-top-color: var(--color-accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error-banner { background: var(--color-error-bg, #2d1b1b); border: 1px solid var(--color-error, #e74c3c); color: var(--color-error, #e74c3c); padding: 12px 16px; border-radius: 6px; margin-top: 16px; display: flex; align-items: center; justify-content: space-between; }
    .error-banner button { background: transparent; color: var(--color-error, #e74c3c); border: 1px solid var(--color-error, #e74c3c); padding: 4px 12px; border-radius: 4px; cursor: pointer; }
  `]
})
export class LeaderboardComponent implements OnInit {
  private api = inject(AdminApiService);
  entries = signal<LeaderboardEntry[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  ngOnInit() {
    this.loadLeaderboard();
  }

  loadLeaderboard() {
    this.loading.set(true);
    this.error.set(null);
    this.api.getLeaderboard().subscribe({
      next: (e) => {
        this.entries.set(e);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load leaderboard');
        this.loading.set(false);
      },
    });
  }
}
