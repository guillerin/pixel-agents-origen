import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShopAdminApiService } from '../../../core/services/shop-admin-api.service';
import { DataTableComponent, TableColumn, TableAction } from '../../../shared/components/data-table/data-table.component';
import type { FurnitureProduct, FurnitureCategory } from '@token-town/shared';
import type { ProductFormData, PaginatedResponse } from '../../../shared/models/shop.models';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, DataTableComponent],
  templateUrl: './products.component.html',
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
    .btn-primary {
      background: var(--color-accent);
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn-primary:hover {
      opacity: 0.9;
    }
    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 16px;
    }
    .stat-label {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }
    .stat-value {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--color-text);
    }
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }
    .modal {
      background: var(--color-bg);
      border-radius: 12px;
      max-width: 600px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    }
    .modal-header {
      padding: 20px;
      border-bottom: 1px solid var(--color-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-header h2 {
      margin: 0;
      font-size: 1.25rem;
      color: var(--color-text);
    }
    .btn-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      color: var(--color-text-muted);
      cursor: pointer;
      padding: 4px;
    }
    .modal-body {
      padding: 20px;
    }
    .form-group {
      margin-bottom: 16px;
    }
    .form-group label {
      display: block;
      margin-bottom: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text);
    }
    .form-group input,
    .form-group textarea,
    .form-group select {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      background: var(--color-surface);
      color: var(--color-text);
      font-size: 0.875rem;
      box-sizing: border-box;
    }
    .form-group textarea {
      min-height: 100px;
      resize: vertical;
    }
    .form-group input:focus,
    .form-group textarea:focus,
    .form-group select:focus {
      outline: none;
      border-color: var(--color-accent);
    }
    .form-group .error {
      color: var(--color-error, #e74c3c);
      font-size: 0.75rem;
      margin-top: 4px;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .image-upload {
      border: 2px dashed var(--color-border);
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.15s;
    }
    .image-upload:hover {
      border-color: var(--color-accent);
    }
    .image-upload input {
      display: none;
    }
    .image-preview {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 12px;
    }
    .preview-item {
      position: relative;
      width: 80px;
      height: 80px;
    }
    .preview-item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 6px;
      border: 1px solid var(--color-border);
    }
    .preview-item button {
      position: absolute;
      top: -8px;
      right: -8px;
      background: var(--color-error, #e74c3c);
      color: white;
      border: none;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      cursor: pointer;
      font-size: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .checkbox-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .checkbox-group input[type="checkbox"] {
      width: auto;
    }
    .modal-footer {
      padding: 16px 20px;
      border-top: 1px solid var(--color-border);
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    .btn-secondary {
      background: var(--color-border);
      color: var(--color-text);
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.875rem;
    }
    @media (max-width: 640px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ProductsComponent implements OnInit {
  private api = inject(ShopAdminApiService);

  products = signal<FurnitureProduct[]>([]);
  availableCount = computed(() => this.products().filter(p => p.isAvailable).length);
  legendaryCount = computed(() => this.products().filter(p => p.rarity === 'legendary').length);
  rareCount = computed(() => this.products().filter(p => p.rarity === 'rare').length);
  loading = signal(false);
  error = signal<string | null>(null);
  showModal = signal(false);
  editingProduct = signal<FurnitureProduct | null>(null);
  saving = signal(false);
  formErrors: Record<string, string> = {};

  categories = signal<FurnitureCategory[]>([]);

  readonly rarities: Array<{ value: string; label: string }> = [
    { value: 'common', label: 'Common' },
    { value: 'uncommon', label: 'Uncommon' },
    { value: 'rare', label: 'Rare' },
    { value: 'legendary', label: 'Legendary' },
  ];

  formData: ProductFormData = {
    categoryId: '',
    name: '',
    description: '',
    priceCoins: 0,
    rarity: 'common',
    spriteUrl: '',
    thumbnailUrl: '',
    width: 1,
    height: 1,
    canStack: false,
    isAvailable: true,
    maxPerUser: null,
    stockQuantity: null,
    tags: '',
  };

  columns: TableColumn[] = [
    { key: 'thumbnailUrl', label: 'Image', type: 'image' },
    { key: 'name', label: 'Product Name', sortable: true },
    { key: 'rarity', label: 'Rarity', type: 'badge', sortable: true,
      badgeClass: (v) => v === 'legendary' ? 'badge-warning' : v === 'rare' ? 'badge-info' : v === 'uncommon' ? 'badge-success' : 'badge-default' },
    { key: 'priceCoins', label: 'Price (coins)', type: 'number', sortable: true },
    { key: 'isAvailable', label: 'Available', type: 'badge',
      badgeClass: (v) => v ? 'badge-success' : 'badge-warning',
      formatter: (v) => v ? 'Yes' : 'No' },
  ];

  actions: TableAction[] = [
    { label: 'Edit', class: 'btn-secondary', handler: (p) => this.editProduct(p) },
    { label: 'Delete', class: 'btn-danger', handler: (p) => this.deleteProduct(p) },
  ];

  ngOnInit() {
    this.loadProducts();
    this.loadCategories();
  }

  loadProducts() {
    this.loading.set(true);
    this.error.set(null);
    this.api.getProducts().subscribe({
      next: (response: PaginatedResponse<FurnitureProduct>) => {
        this.products.set(response.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load products');
        this.loading.set(false);
      }
    });
  }

  loadCategories() {
    this.api.getCategories().subscribe({
      next: (cats) => this.categories.set(cats),
    });
  }

  openModal() { this.showModal.set(true); this.resetForm(); }
  closeModal() { this.showModal.set(false); this.resetForm(); }

  resetForm() {
    this.editingProduct.set(null);
    this.formData = {
      categoryId: '', name: '', description: '', priceCoins: 0,
      rarity: 'common', spriteUrl: '', thumbnailUrl: '',
      width: 1, height: 1, canStack: false, isAvailable: true,
      maxPerUser: null, stockQuantity: null, tags: '',
    };
    this.formErrors = {};
  }

  editProduct(product: FurnitureProduct) {
    this.editingProduct.set(product);
    this.formData = {
      categoryId: product.categoryId,
      name: product.name,
      description: product.description ?? '',
      priceCoins: product.priceCoins,
      rarity: product.rarity,
      spriteUrl: product.spriteUrl,
      thumbnailUrl: product.thumbnailUrl ?? '',
      width: product.width,
      height: product.height,
      canStack: product.canStack,
      isAvailable: product.isAvailable,
      maxPerUser: product.maxPerUser ?? null,
      stockQuantity: product.stockQuantity ?? null,
      tags: (product.tags ?? []).join(', '),
    };
    this.showModal.set(true);
  }

  deleteProduct(product: FurnitureProduct) {
    if (!confirm(`Delete "${product.name}"?`)) return;
    this.api.deleteProduct(product.id).subscribe({
      next: () => this.loadProducts(),
      error: (err) => this.error.set(err?.error?.message ?? 'Failed to delete product')
    });
  }

  validateForm(): boolean {
    this.formErrors = {};
    if (!this.formData.name?.trim()) this.formErrors['name'] = 'Product name is required';
    if (!this.formData.categoryId) this.formErrors['categoryId'] = 'Category is required';
    if (!this.formData.spriteUrl?.trim()) this.formErrors['spriteUrl'] = 'Sprite URL is required';
    if (this.formData.priceCoins < 0) this.formErrors['priceCoins'] = 'Price must be >= 0';
    return Object.keys(this.formErrors).length === 0;
  }

  saveProduct() {
    if (!this.validateForm()) return;
    this.saving.set(true);
    const request = this.editingProduct()
      ? this.api.updateProduct(this.editingProduct()!.id, this.formData)
      : this.api.createProduct(this.formData);

    request.subscribe({
      next: () => { this.saving.set(false); this.closeModal(); this.loadProducts(); },
      error: (err) => { this.saving.set(false); this.formErrors['submit'] = err?.error?.message ?? 'Failed to save product'; }
    });
  }
}
