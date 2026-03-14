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
    button { padding: 4px 10px; border-radius: 4px; border: none; cursor: pointer; font-size: 0.8rem; }
    .btn-adjust { background: var(--color-accent); color: white; }
  `]
})
export class UsersListComponent implements OnInit {
  private api = inject(AdminApiService);
  users = signal<User[]>([]);
  adjustAmounts: Record<string, number> = {};

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.api.getUsers().subscribe(u => this.users.set(u));
  }

  adjustCoins(userId: string) {
    const amount = this.adjustAmounts[userId] ?? 0;
    if (amount === 0) return;
    this.api.adjustCoins(userId, amount, 'admin manual adjustment').subscribe(() => this.loadUsers());
  }
}
