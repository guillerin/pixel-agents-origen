import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShopAdminApiService } from '../../../core/services/shop-admin-api.service';
import { DataTableComponent, TableColumn, TableAction } from '../../../shared/components/data-table/data-table.component';
import type { FurnitureCategory } from '@token-town/shared';
import type { CategoryFormData } from '../../../shared/models/shop.models';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, DataTableComponent],
  templateUrl: './categories.component.html',
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
      max-width: 500px;
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
      min-height: 80px;
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
    .slug-preview {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      margin-top: 4px;
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
  `]
})
export class CategoriesComponent implements OnInit {
  private api = inject(ShopAdminApiService);

  categories = signal<FurnitureCategory[]>([]);
  activeCount = computed(() => this.categories().filter(c => c.isActive).length);
  inactiveCount = computed(() => this.categories().filter(c => !c.isActive).length);
  loading = signal(false);
  error = signal<string | null>(null);
  showModal = signal(false);
  editingCategory = signal<FurnitureCategory | null>(null);
  saving = signal(false);
  formErrors: Record<string, string> = {};

  formData: CategoryFormData = {
    name: '',
    displayName: '',
    description: '',
    iconUrl: '',
    sortOrder: 0,
  };

  columns: TableColumn[] = [
    { key: 'displayName', label: 'Display Name', sortable: true },
    { key: 'name', label: 'Name (slug)' },
    { key: 'description', label: 'Description' },
    { key: 'sortOrder', label: 'Sort Order', type: 'number', sortable: true },
    { key: 'isActive', label: 'Active', type: 'badge', badgeClass: (v) => v ? 'badge-success' : 'badge-warning' },
  ];

  actions: TableAction[] = [
    { label: 'Edit', class: 'btn-secondary', handler: (c) => this.editCategory(c) },
    { label: 'Delete', class: 'btn-danger', handler: (c) => this.deleteCategory(c) },
  ];

  ngOnInit() {
    this.loadCategories();
  }

  loadCategories() {
    this.loading.set(true);
    this.error.set(null);
    this.api.getCategories().subscribe({
      next: (data) => {
        this.categories.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load categories');
        this.loading.set(false);
      }
    });
  }

  openModal() {
    this.showModal.set(true);
    this.resetForm();
  }

  closeModal() {
    this.showModal.set(false);
    this.resetForm();
  }

  resetForm() {
    this.editingCategory.set(null);
    this.formData = { name: '', displayName: '', description: '', iconUrl: '', sortOrder: 0 };
    this.formErrors = {};
  }

  editCategory(category: FurnitureCategory) {
    this.editingCategory.set(category);
    this.formData = {
      name: category.name,
      displayName: category.displayName,
      description: category.description ?? '',
      iconUrl: category.iconUrl ?? '',
      sortOrder: category.sortOrder,
    };
    this.showModal.set(true);
  }

  deleteCategory(category: FurnitureCategory) {
    if (!confirm(`Are you sure you want to delete "${category.displayName}"?`)) return;
    this.api.deleteCategory(category.id).subscribe({
      next: () => this.loadCategories(),
      error: (err) => this.error.set(err?.error?.message ?? 'Failed to delete category')
    });
  }

  generateName() {
    this.formData.name = this.formData.displayName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  }

  validateForm(): boolean {
    this.formErrors = {};
    if (!this.formData.displayName?.trim()) this.formErrors['displayName'] = 'Display name is required';
    if (!this.formData.name?.trim()) {
      this.formErrors['name'] = 'Name (slug) is required';
    } else if (!/^[a-z0-9_-]+$/.test(this.formData.name)) {
      this.formErrors['name'] = 'Use only lowercase letters, numbers, hyphens, underscores';
    }
    return Object.keys(this.formErrors).length === 0;
  }

  saveCategory() {
    if (!this.validateForm()) return;
    this.saving.set(true);
    const request = this.editingCategory()
      ? this.api.updateCategory(this.editingCategory()!.id, this.formData)
      : this.api.createCategory(this.formData);

    request.subscribe({
      next: () => { this.saving.set(false); this.closeModal(); this.loadCategories(); },
      error: (err) => { this.saving.set(false); this.formErrors['submit'] = err?.error?.message ?? 'Failed to save category'; }
    });
  }
}
