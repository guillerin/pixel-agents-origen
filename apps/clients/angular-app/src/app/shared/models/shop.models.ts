// Re-export canonical types from @token-town/shared
export type {
  FurnitureCategory,
  FurnitureProduct,
  FurnitureRarity,
  FurnitureInventoryItem,
  FurniturePlacement,
  ShopPurchaseRequest,
  ShopPurchaseResponse,
  ShopCatalogQuery,
  ShopCatalogResponse,
  ShopAnalytics,
  ProductAnalytics,
  CreateCategoryRequest,
  CreateProductRequest,
  ShopErrorResponse,
} from '@token-town/shared';

// ─── Admin panel analytics response ──────────────────────────────────────────
// ShopAnalytics from @token-town/shared is the canonical shape:
//   totalRevenue, totalPurchases, uniqueCustomers, averageOrderValue,
//   topProducts[].{productId,name,purchases,revenue}
//   revenueByCategory[].{categoryId,categoryName,revenue,percentage}
//   revenueOverTime[].{date,revenue,purchases}

// ─── Admin panel purchase transaction ────────────────────────────────────────
export interface AdminTransaction {
  id: string;
  userId: string;
  userName: string;
  type: 'purchase' | 'refund' | 'adjustment';
  productId?: string;
  productName?: string;
  coinsSpent: number;
  balanceBefore: number;
  balanceAfter: number;
  reason?: string;
  createdAt: string;
}

// ─── Inventory overview (admin) ───────────────────────────────────────────────
export interface InventoryOverview {
  totalProducts: number;
  totalUniqueOwners: number;
  topOwnedProducts: Array<{
    productId: string;
    productName: string;
    totalQuantity: number;
    uniqueOwners: number;
  }>;
}

// ─── Paginated response wrapper ───────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Form models (Angular admin UI only, not shared with server) ──────────────
export interface ProductFormData {
  categoryId: string;
  name: string;
  description: string;
  priceCoins: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  spriteUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  canStack: boolean;
  isAvailable: boolean;
  maxPerUser: number | null;
  stockQuantity: number | null;
  tags: string;
}

export interface CategoryFormData {
  name: string;
  displayName: string;
  description: string;
  iconUrl: string;
  sortOrder: number;
}

// ─── Table helpers ─────────────────────────────────────────────────────────────
export interface TableSort {
  column: string;
  direction: 'asc' | 'desc';
}

export interface TableFilter {
  search: string;
  category?: string;
  rarity?: string;
  isAvailable?: string;
  dateFrom?: string;
  dateTo?: string;
}
