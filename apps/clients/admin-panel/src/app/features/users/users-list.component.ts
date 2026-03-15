import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService } from '../../core/services/admin-api.service';
import type { User } from '../../shared/models/api.models';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users-list.component.html',
  styles: [`
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--color-border); }
    th { color: var(--color-text-muted); font-weight: 600; font-size: 0.8rem; text-transform: uppercase; }
    tr:hover td { background: var(--color-surface); }
    .coin { color: var(--color-coin); }
    .badge { padding: 2px 8px; border-radius: 99px; font-size: 0.75rem; }
    .badge-admin { background: var(--color-accent); color: white; }
    .badge-user { background: var(--color-border); color: var(--color-text-muted); }
    input[type=number] { width: 80px; background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); padding: 4px 8px; border-radius: 4px; }
    input.input-error { border-color: var(--color-error, #e74c3c); }
    button { padding: 4px 10px; border-radius: 4px; border: none; cursor: pointer; font-size: 0.8rem; }
    .btn-adjust { background: var(--color-accent); color: white; }
    .btn-adjust:disabled { opacity: 0.5; cursor: not-allowed; }
    .loading { color: var(--color-text-muted); margin-top: 16px; display: flex; align-items: center; gap: 8px; }
    .spinner { width: 16px; height: 16px; border: 2px solid var(--color-border); border-top-color: var(--color-accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error-banner { background: var(--color-error-bg, #2d1b1b); border: 1px solid var(--color-error, #e74c3c); color: var(--color-error, #e74c3c); padding: 12px 16px; border-radius: 6px; margin-top: 16px; display: flex; align-items: center; justify-content: space-between; }
    .error-banner button { background: transparent; color: var(--color-error, #e74c3c); border: 1px solid var(--color-error, #e74c3c); padding: 4px 12px; border-radius: 4px; cursor: pointer; }
    .inline-error { color: var(--color-error, #e74c3c); font-size: 0.75rem; margin-top: 2px; }
    .adjust-cell { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
  `]
})
export class UsersListComponent implements OnInit {
  private api = inject(AdminApiService);
  users = signal<User[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  adjustAmounts: Record<string, number> = {};
  adjustErrors: Record<string, string> = {};
  adjustingUser = signal<string | null>(null);

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading.set(true);
    this.error.set(null);
    this.api.getUsers().subscribe({
      next: (u) => {
        this.users.set(u);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load users');
        this.loading.set(false);
      },
    });
  }

  validateAdjustAmount(userId: string): boolean {
    const amount = this.adjustAmounts[userId];
    if (amount === undefined || amount === null || isNaN(amount)) {
      this.adjustErrors[userId] = 'Enter a valid number';
      return false;
    }
    if (!Number.isInteger(amount)) {
      this.adjustErrors[userId] = 'Must be a whole number';
      return false;
    }
    if (amount === 0) {
      this.adjustErrors[userId] = 'Amount cannot be zero';
      return false;
    }
    delete this.adjustErrors[userId];
    return true;
  }

  adjustCoins(userId: string) {
    if (!this.validateAdjustAmount(userId)) return;
    const amount = this.adjustAmounts[userId];
    this.adjustingUser.set(userId);
    this.api.adjustCoins(userId, amount, 'admin manual adjustment').subscribe({
      next: () => {
        this.adjustingUser.set(null);
        delete this.adjustAmounts[userId];
        this.loadUsers();
      },
      error: (err) => {
        this.adjustingUser.set(null);
        this.adjustErrors[userId] = err?.error?.message ?? 'Failed to adjust coins';
      },
    });
  }
}
