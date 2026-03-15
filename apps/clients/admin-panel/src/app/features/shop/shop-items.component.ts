import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService } from '../../core/services/admin-api.service';
import type { ShopItem } from '../../shared/models/api.models';

@Component({
  selector: 'app-shop-items',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './shop-items.component.html',
  styles: [`
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--color-border); }
    th { color: var(--color-text-muted); font-size: 0.8rem; text-transform: uppercase; }
    tr:hover td { background: var(--color-surface); }
    .coin { color: var(--color-coin); }
    .badge { padding: 2px 8px; border-radius: 99px; font-size: 0.75rem; font-weight: 600; }
    .common { background: #374151; color: #9ca3af; }
    .uncommon { background: #064e3b; color: #6ee7b7; }
    .rare { background: #1e3a8a; color: #93c5fd; }
    .legendary { background: #78350f; color: #fcd34d; }
    input[type=number] { width: 80px; background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); padding: 4px 8px; border-radius: 4px; }
    input.input-error { border-color: var(--color-error, #e74c3c); }
    button { padding: 4px 10px; border-radius: 4px; border: none; cursor: pointer; font-size: 0.8rem; margin-left: 4px; }
    .btn-save { background: var(--color-success); color: white; }
    .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-toggle { background: var(--color-border); color: var(--color-text); }
    .btn-toggle:disabled { opacity: 0.5; cursor: not-allowed; }
    .loading { color: var(--color-text-muted); margin-top: 16px; display: flex; align-items: center; gap: 8px; }
    .spinner { width: 16px; height: 16px; border: 2px solid var(--color-border); border-top-color: var(--color-accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error-banner { background: var(--color-error-bg, #2d1b1b); border: 1px solid var(--color-error, #e74c3c); color: var(--color-error, #e74c3c); padding: 12px 16px; border-radius: 6px; margin-top: 16px; display: flex; align-items: center; justify-content: space-between; }
    .error-banner button { background: transparent; color: var(--color-error, #e74c3c); border: 1px solid var(--color-error, #e74c3c); padding: 4px 12px; border-radius: 4px; cursor: pointer; margin-left: 0; }
    .inline-error { color: var(--color-error, #e74c3c); font-size: 0.75rem; margin-top: 2px; }
    .price-cell { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
  `]
})
export class ShopItemsComponent implements OnInit {
  private api = inject(AdminApiService);
  items = signal<ShopItem[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  editPrices: Record<string, number> = {};
  priceErrors: Record<string, string> = {};
  savingItem = signal<string | null>(null);
  togglingItem = signal<string | null>(null);

  ngOnInit() {
    this.loadItems();
  }

  loadItems() {
    this.loading.set(true);
    this.error.set(null);
    this.api.getShopItems().subscribe({
      next: (i) => {
        this.items.set(i);
        i.forEach(item => this.editPrices[item.id] = item.price);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load shop items');
        this.loading.set(false);
      },
    });
  }

  validatePrice(itemId: string): boolean {
    const price = this.editPrices[itemId];
    if (price === undefined || price === null || isNaN(price)) {
      this.priceErrors[itemId] = 'Enter a valid number';
      return false;
    }
    if (price < 0) {
      this.priceErrors[itemId] = 'Price cannot be negative';
      return false;
    }
    if (!Number.isInteger(price)) {
      this.priceErrors[itemId] = 'Price must be a whole number';
      return false;
    }
    delete this.priceErrors[itemId];
    return true;
  }

  savePrice(itemId: string) {
    if (!this.validatePrice(itemId)) return;
    this.savingItem.set(itemId);
    this.api.updateItem(itemId, { price: this.editPrices[itemId] }).subscribe({
      next: () => {
        this.savingItem.set(null);
        this.loadItems();
      },
      error: (err) => {
        this.savingItem.set(null);
        this.priceErrors[itemId] = err?.error?.message ?? 'Failed to save price';
      },
    });
  }

  toggleAvailability(item: ShopItem) {
    this.togglingItem.set(item.id);
    this.api.updateItem(item.id, { isAvailable: !item.isAvailable }).subscribe({
      next: () => {
        this.togglingItem.set(null);
        this.loadItems();
      },
      error: (err) => {
        this.togglingItem.set(null);
        this.error.set(err?.error?.message ?? 'Failed to toggle availability');
      },
    });
  }
}
