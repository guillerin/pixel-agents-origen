import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  FurnitureProduct,
  FurnitureCategory,
  FurnitureRarity,
  ShopAnalytics,
  CreateCategoryRequest,
  CreateProductRequest,
} from '@token-town/shared';
import type {
  AdminTransaction,
  InventoryOverview,
  PaginatedResponse,
  ProductFormData,
  CategoryFormData,
} from '../../shared/models/shop.models';

@Injectable({ providedIn: 'root' })
export class ShopAdminApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  // ─── Products ──────────────────────────────────────────────────────────────

  getProducts(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    categoryId?: string;
    rarity?: FurnitureRarity;
    isAvailable?: boolean;
  }): Observable<PaginatedResponse<FurnitureProduct>> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page);
    if (params?.pageSize) httpParams = httpParams.set('pageSize', params.pageSize);
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.categoryId) httpParams = httpParams.set('category', params.categoryId);
    if (params?.rarity) httpParams = httpParams.set('rarity', params.rarity);
    if (params?.isAvailable !== undefined) httpParams = httpParams.set('isAvailable', String(params.isAvailable));
    return this.http.get<PaginatedResponse<FurnitureProduct>>(`${this.base}/admin/shop/products`, { params: httpParams });
  }

  getProduct(productId: string): Observable<FurnitureProduct> {
    return this.http.get<FurnitureProduct>(`${this.base}/admin/shop/products/${productId}`);
  }

  createProduct(data: ProductFormData): Observable<FurnitureProduct> {
    const body: CreateProductRequest = {
      categoryId: data.categoryId,
      name: data.name,
      description: data.description || undefined,
      priceCoins: data.priceCoins,
      rarity: data.rarity,
      spriteUrl: data.spriteUrl,
      thumbnailUrl: data.thumbnailUrl || undefined,
      width: data.width,
      height: data.height,
      canStack: data.canStack,
      maxPerUser: data.maxPerUser ?? undefined,
      stockQuantity: data.stockQuantity ?? undefined,
      tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    };
    return this.http.post<FurnitureProduct>(`${this.base}/admin/shop/products`, body);
  }

  updateProduct(productId: string, data: Partial<ProductFormData>): Observable<FurnitureProduct> {
    const body: Partial<CreateProductRequest> = {};
    if (data.categoryId !== undefined) body.categoryId = data.categoryId;
    if (data.name !== undefined) body.name = data.name;
    if (data.description !== undefined) body.description = data.description;
    if (data.priceCoins !== undefined) body.priceCoins = data.priceCoins;
    if (data.rarity !== undefined) body.rarity = data.rarity;
    if (data.spriteUrl !== undefined) body.spriteUrl = data.spriteUrl;
    if (data.thumbnailUrl !== undefined) body.thumbnailUrl = data.thumbnailUrl;
    if (data.width !== undefined) body.width = data.width;
    if (data.height !== undefined) body.height = data.height;
    if (data.canStack !== undefined) body.canStack = data.canStack;
    if (data.maxPerUser !== undefined) body.maxPerUser = data.maxPerUser ?? undefined;
    if (data.stockQuantity !== undefined) body.stockQuantity = data.stockQuantity ?? undefined;
    if (data.tags !== undefined) body.tags = data.tags.split(',').map(t => t.trim()).filter(Boolean);
    return this.http.put<FurnitureProduct>(`${this.base}/admin/shop/products/${productId}`, body);
  }

  deleteProduct(productId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/shop/products/${productId}`);
  }

  toggleProductAvailability(productId: string, isAvailable: boolean): Observable<FurnitureProduct> {
    return this.http.patch<FurnitureProduct>(`${this.base}/admin/shop/products/${productId}`, { isAvailable });
  }

  // ─── Categories ────────────────────────────────────────────────────────────

  getCategories(): Observable<FurnitureCategory[]> {
    return this.http.get<FurnitureCategory[]>(`${this.base}/admin/shop/categories`);
  }

  getCategory(categoryId: string): Observable<FurnitureCategory> {
    return this.http.get<FurnitureCategory>(`${this.base}/admin/shop/categories/${categoryId}`);
  }

  createCategory(data: CategoryFormData): Observable<FurnitureCategory> {
    const body: CreateCategoryRequest = {
      name: data.name,
      displayName: data.displayName,
      description: data.description || undefined,
      iconUrl: data.iconUrl || undefined,
      sortOrder: data.sortOrder,
    };
    return this.http.post<FurnitureCategory>(`${this.base}/admin/shop/categories`, body);
  }

  updateCategory(categoryId: string, data: Partial<CategoryFormData>): Observable<FurnitureCategory> {
    const body: Partial<CreateCategoryRequest> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.displayName !== undefined) body.displayName = data.displayName;
    if (data.description !== undefined) body.description = data.description;
    if (data.iconUrl !== undefined) body.iconUrl = data.iconUrl;
    if (data.sortOrder !== undefined) body.sortOrder = data.sortOrder;
    return this.http.put<FurnitureCategory>(`${this.base}/admin/shop/categories/${categoryId}`, body);
  }

  deleteCategory(categoryId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/shop/categories/${categoryId}`);
  }

  // ─── Analytics ─────────────────────────────────────────────────────────────

  getAnalytics(params?: { from?: string; to?: string }): Observable<ShopAnalytics> {
    let httpParams = new HttpParams();
    if (params?.from) httpParams = httpParams.set('from', params.from);
    if (params?.to) httpParams = httpParams.set('to', params.to);
    return this.http.get<ShopAnalytics>(`${this.base}/admin/shop/analytics`, { params: httpParams });
  }

  // ─── Inventory ─────────────────────────────────────────────────────────────

  getInventoryOverview(): Observable<InventoryOverview> {
    return this.http.get<InventoryOverview>(`${this.base}/admin/shop/inventory`);
  }

  // ─── Transactions ──────────────────────────────────────────────────────────

  getTransactions(params?: {
    page?: number;
    pageSize?: number;
    userId?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Observable<PaginatedResponse<AdminTransaction>> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page);
    if (params?.pageSize) httpParams = httpParams.set('pageSize', params.pageSize);
    if (params?.userId) httpParams = httpParams.set('userId', params.userId);
    if (params?.type) httpParams = httpParams.set('type', params.type);
    if (params?.dateFrom) httpParams = httpParams.set('dateFrom', params.dateFrom);
    if (params?.dateTo) httpParams = httpParams.set('dateTo', params.dateTo);
    return this.http.get<PaginatedResponse<AdminTransaction>>(`${this.base}/admin/shop/transactions`, { params: httpParams });
  }
}
