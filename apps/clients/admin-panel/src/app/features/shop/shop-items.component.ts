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
    button { padding: 4px 10px; border-radius: 4px; border: none; cursor: pointer; font-size: 0.8rem; margin-left: 4px; }
    .btn-save { background: var(--color-success); color: white; }
    .btn-toggle { background: var(--color-border); color: var(--color-text); }
  `]
})
export class ShopItemsComponent implements OnInit {
  private api = inject(AdminApiService);
  items = signal<ShopItem[]>([]);
  editPrices: Record<string, number> = {};

  ngOnInit() {
    this.loadItems();
  }

  loadItems() {
    this.api.getShopItems().subscribe(i => {
      this.items.set(i);
      i.forEach(item => this.editPrices[item.id] = item.price);
    });
  }

  savePrice(itemId: string) {
    this.api.updateItem(itemId, { price: this.editPrices[itemId] }).subscribe(() => this.loadItems());
  }

  toggleAvailability(item: ShopItem) {
    this.api.updateItem(item.id, { isAvailable: !item.isAvailable }).subscribe(() => this.loadItems());
  }
}
