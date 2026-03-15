import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { User, ShopItem, LeaderboardEntry, AdminStats } from '../../shared/models/api.models';

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  // Users
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.base}/admin/users`);
  }

  adjustCoins(userId: string, amount: number, reason: string): Observable<{ new_balance: number }> {
    return this.http.post<{ new_balance: number }>(`${this.base}/admin/users/${userId}/adjust-coins`, { amount, reason });
  }

  // Shop
  getShopItems(): Observable<ShopItem[]> {
    return this.http.get<ShopItem[]>(`${this.base}/admin/shop/items`);
  }

  updateItem(itemId: string, data: Partial<ShopItem>): Observable<void> {
    return this.http.put<void>(`${this.base}/admin/shop/items/${itemId}`, data);
  }

  createItem(item: Omit<ShopItem, 'isAvailable'>): Observable<void> {
    return this.http.post<void>(`${this.base}/admin/shop/items`, item);
  }

  deleteItem(itemId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/shop/items/${itemId}`);
  }

  // Stats
  getStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.base}/admin/stats`);
  }

  // Leaderboard
  getLeaderboard(): Observable<LeaderboardEntry[]> {
    return this.http.get<LeaderboardEntry[]>(`${this.base}/leaderboard`);
  }
}
