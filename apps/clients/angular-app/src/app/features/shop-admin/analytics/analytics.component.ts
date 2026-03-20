import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { ShopAdminApiService } from '../../../core/services/shop-admin-api.service';
import type { ShopAnalytics } from '@token-town/shared';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, DatePipe, DecimalPipe],
  templateUrl: './analytics.component.html',
  styles: [`
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    h1 {
      margin: 0;
      font-size: 1.5rem;
      color: var(--color-text);
    }
    .period-selector {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .period-btn {
      padding: 8px 16px;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      background: var(--color-surface);
      color: var(--color-text);
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.15s;
    }
    .period-btn:hover {
      background: var(--color-border);
    }
    .period-btn.active {
      background: var(--color-accent);
      color: white;
      border-color: var(--color-accent);
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 20px;
    }
    .stat-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 12px;
    }
    .stat-label {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .stat-icon {
      font-size: 1.5rem;
      opacity: 0.5;
    }
    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--color-text);
      line-height: 1;
    }
    .stat-change {
      font-size: 0.875rem;
      margin-top: 8px;
    }
    .stat-change.positive {
      color: #6ee7b7;
    }
    .stat-change.negative {
      color: #fca5a5;
    }
    .charts-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    @media (max-width: 1024px) {
      .charts-grid {
        grid-template-columns: 1fr;
      }
    }
    .chart-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 20px;
    }
    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .chart-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text);
      margin: 0;
    }
    .revenue-chart {
      height: 250px;
      display: flex;
      align-items: flex-end;
      gap: 8px;
      padding: 20px 0;
    }
    .chart-bar-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .chart-bar {
      width: 100%;
      background: var(--color-accent);
      border-radius: 4px 4px 0 0;
      transition: height 0.3s ease;
      position: relative;
      cursor: pointer;
    }
    .chart-bar:hover {
      opacity: 0.8;
    }
    .chart-bar-label {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
    .chart-bar-tooltip {
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: 4px;
      padding: 8px 12px;
      font-size: 0.75rem;
      white-space: nowrap;
      z-index: 10;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      margin-bottom: 8px;
      display: none;
    }
    .chart-bar:hover .chart-bar-tooltip {
      display: block;
    }
    .products-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .product-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      background: var(--color-bg);
    }
    .product-info {
      flex: 1;
      min-width: 0;
    }
    .product-name {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .product-stats {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      margin-top: 4px;
    }
    .product-revenue {
      text-align: right;
    }
    .revenue-amount {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text);
    }
    .category-chart {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .category-item {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .category-bar-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .category-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .category-name {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text);
    }
    .category-stats {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }
    .category-bar {
      height: 8px;
      background: var(--color-border);
      border-radius: 4px;
      overflow: hidden;
    }
    .category-bar-fill {
      height: 100%;
      background: var(--color-accent);
      border-radius: 4px;
      transition: width 0.3s ease;
    }
    .loading-state {
      text-align: center;
      padding: 48px;
      color: var(--color-text-muted);
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid var(--color-border);
      border-top-color: var(--color-accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .error-banner {
      background: var(--color-error-bg, #2d1b1b);
      border: 1px solid var(--color-error, #e74c3c);
      color: var(--color-error, #e74c3c);
      padding: 12px 16px;
      border-radius: 6px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
  `]
})
export class AnalyticsComponent implements OnInit {
  private api = inject(ShopAdminApiService);

  analytics = signal<ShopAnalytics | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  selectedPeriod = signal<'7d' | '30d' | '90d' | '1y'>('30d');

  periods = [
    { value: '7d' as const, label: '7 Days' },
    { value: '30d' as const, label: '30 Days' },
    { value: '90d' as const, label: '90 Days' },
    { value: '1y' as const, label: '1 Year' },
  ];

  ngOnInit() {
    this.loadAnalytics();
  }

  loadAnalytics() {
    this.loading.set(true);
    this.error.set(null);
    const { from, to } = this.periodToDateRange(this.selectedPeriod());
    this.api.getAnalytics({ from, to }).subscribe({
      next: (data) => { this.analytics.set(data); this.loading.set(false); },
      error: (err) => { this.error.set(err?.error?.message ?? 'Failed to load analytics'); this.loading.set(false); }
    });
  }

  selectPeriod(period: '7d' | '30d' | '90d' | '1y') {
    this.selectedPeriod.set(period);
    this.loadAnalytics();
  }

  private periodToDateRange(period: '7d' | '30d' | '90d' | '1y'): { from: string; to: string } {
    const to = new Date();
    const from = new Date();
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    from.setDate(from.getDate() - days);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(value);
  }

  get maxRevenue(): number {
    const trend = this.analytics()?.revenueOverTime ?? [];
    return Math.max(...trend.map(d => d.revenue), 0);
  }

  get maxCategoryRevenue(): number {
    const cats = this.analytics()?.revenueByCategory ?? [];
    return Math.max(...cats.map(c => c.revenue), 0);
  }
}
