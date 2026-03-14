import { Component, inject, OnInit, signal } from '@angular/core';
import { AdminApiService } from '../../core/services/admin-api.service';
import type { AdminStats } from '../../shared/models/api.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  styles: [`
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 24px; }
    .stat-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; padding: 24px; }
    .stat-value { font-size: 2rem; font-weight: 700; color: var(--color-accent-light); }
    .stat-label { color: var(--color-text-muted); margin-top: 4px; }
    h1 { color: var(--color-text); }
  `]
})
export class DashboardComponent implements OnInit {
  private api = inject(AdminApiService);
  stats = signal<AdminStats | null>(null);

  ngOnInit() {
    this.api.getStats().subscribe(s => this.stats.set(s));
  }
}
