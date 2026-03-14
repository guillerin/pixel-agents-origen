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
  `]
})
export class LeaderboardComponent implements OnInit {
  private api = inject(AdminApiService);
  entries = signal<LeaderboardEntry[]>([]);
  ngOnInit() { this.api.getLeaderboard().subscribe(e => this.entries.set(e)); }
}
