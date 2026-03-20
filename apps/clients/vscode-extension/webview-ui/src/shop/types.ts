/**
 * Shop types for furniture shop functionality
 */

export type FurnitureCategorySlug =
  | 'desks'
  | 'chairs'
  | 'storage'
  | 'decor'
  | 'electronics'
  | 'wall'
  | 'misc';

export interface ShopProduct {
  id: string;
  name: string;
  description: string;
  category: FurnitureCategorySlug;
  price: number;
  sprite: string[][] | string; // Pixel art sprite data or remote URL from server
  footprintW: number;
  footprintH: number;
  isDesk: boolean;
  canPlaceOnWalls?: boolean;
  canPlaceOnSurfaces?: boolean;
  backgroundTiles?: number;
  orientation?: string;
  state?: string;
}

export interface UserInventoryItem {
  productId: string;
  purchaseDate: string;
  timesUsed: number;
}

export interface ShopState {
  isOpen: boolean;
  products: ShopProduct[];
  categories: FurnitureCategorySlug[];
  selectedCategory: FurnitureCategorySlug | 'all';
  cart: CartItem[];
  inventory: UserInventoryItem[];
  coins: number;
  isLoading: boolean;
  error: string | null;
  currentView: 'shop' | 'inventory';
  selectedInventoryItem: string | null;
}

export interface CartItem {
  product: ShopProduct;
  quantity: number;
}

export interface PurchaseResult {
  success: boolean;
  message: string;
  newCoinBalance?: number;
  purchasedItems?: string[];
}

export type ShopView = 'shop' | 'inventory' | 'purchase_confirm';
