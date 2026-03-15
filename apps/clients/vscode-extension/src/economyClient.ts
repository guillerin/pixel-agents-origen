import type { ShopItem, User, Wallet } from '@token-town/shared';

import { getServerBaseUrl } from './serverUtils.js';

// ── EconomyClient ────────────────────────────────────────────

export class EconomyClient {
  private serverUrl: string;
  private authToken: string | null = null;

  constructor() {
    this.serverUrl = getServerBaseUrl();
  }

  /** Update the auth token used for API calls. */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /** Get the current auth token. */
  getAuthToken(): string | null {
    return this.authToken;
  }

  /** Register or login using machineId. Returns userId and session token. */
  async register(machineId: string, displayName?: string): Promise<{ userId: string; sessionToken: string }> {
    this.serverUrl = getServerBaseUrl();
    const res = await this.post<{ userId: string; sessionToken: string }>(
      '/api/auth/register',
      { machineId, displayName },
      false,
    );
    this.authToken = res.sessionToken;
    return res;
  }

  /** Get current user profile. */
  async getMe(): Promise<User> {
    return this.get<User>('/api/auth/me');
  }

  /** Get current coin balance. */
  async getBalance(): Promise<Wallet> {
    return this.get<Wallet>('/api/economy/balance');
  }

  /** Get shop catalog. */
  async getShopCatalog(): Promise<ShopItem[]> {
    return this.get<ShopItem[]>('/api/shop/catalog');
  }

  /** Purchase a shop item. */
  async purchase(itemId: string, quantity?: number): Promise<{ success: boolean; remainingCoins?: number; error?: string }> {
    return this.post('/api/shop/purchase', { itemId, quantity: quantity ?? 1 });
  }

  /** Get user inventory. */
  async getInventory(): Promise<Array<{ itemId: string; quantity: number }>> {
    return this.get('/api/inventory');
  }

  /** Get leaderboard. */
  async getLeaderboard(): Promise<Array<{ userId: string; displayName: string; totalCoinsEarned: number; rank: number }>> {
    return this.get('/api/leaderboard');
  }

  /** Get current user's rank. */
  async getMyRank(): Promise<{ rank: number; totalCoinsEarned: number }> {
    return this.get('/api/leaderboard/me');
  }

  /** Clean up resources. */
  dispose(): void {
    this.authToken = null;
  }

  // ── Private ──────────────────────────────────────────────

  private async get<T>(path: string): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    const res = await fetch(`${this.serverUrl}${path}`, { headers });
    if (!res.ok) {
      throw new Error(`GET ${path}: ${res.status} ${res.statusText}`);
    }
    return res.json() as Promise<T>;
  }

  private async post<T>(path: string, body: unknown, requireAuth = true): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (requireAuth && this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    const res = await fetch(`${this.serverUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`POST ${path}: ${res.status} ${res.statusText}`);
    }
    return res.json() as Promise<T>;
  }
}
