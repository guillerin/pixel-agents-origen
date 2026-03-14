export interface User {
  id: string;
  displayName: string;
  email: string;
  coins: number;
  totalCoinsEarned: number;
  role: 'user' | 'admin';
  createdAt: string;
}

export interface ShopItem {
  id: string;
  name: string;
  category: string;
  price: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  isAvailable: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  totalCoinsEarned: number;
}

export interface AdminStats {
  totalUsers: number;
  totalTransactions: number;
  totalCoinsEarned: number;
}
