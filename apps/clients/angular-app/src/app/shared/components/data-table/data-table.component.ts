import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClickOutsideDirective } from '../../directives/click-outside.directive';

export interface TableColumn {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'currency' | 'badge' | 'image' | 'actions';
  sortable?: boolean;
  formatter?: (value: any, row: any) => string;
  badgeClass?: (value: any) => string;
}

export interface TableAction {
  label: string;
  icon?: string;
  class?: string;
  handler: (row: any) => void;
  show?: (row: any) => boolean;
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, FormsModule, ClickOutsideDirective],
  templateUrl: './data-table.component.html',
  styles: [`
    .data-table-wrapper {
      background: var(--color-surface);
      border-radius: 8px;
      border: 1px solid var(--color-border);
      overflow: hidden;
    }
    .table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid var(--color-border);
      gap: 16px;
    }
    .search-box {
      position: relative;
      flex: 1;
      max-width: 400px;
    }
    .search-box input {
      width: 100%;
      padding: 8px 12px 8px 36px;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      background: var(--color-bg);
      color: var(--color-text);
      font-size: 0.875rem;
    }
    .search-box::before {
      content: '🔍';
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 0.875rem;
      opacity: 0.5;
    }
    .filters {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .filter-select {
      padding: 6px 12px;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      background: var(--color-bg);
      color: var(--color-text);
      font-size: 0.875rem;
      cursor: pointer;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    thead {
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
    }
    th {
      text-align: left;
      padding: 12px 16px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-muted);
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
    }
    th.sortable:hover {
      background: var(--color-border);
    }
    th.sortable .sort-icon {
      margin-left: 4px;
      opacity: 0.3;
    }
    th.sortable.active .sort-icon {
      opacity: 1;
    }
    td {
      padding: 12px 16px;
      border-bottom: 1px solid var(--color-border);
      font-size: 0.875rem;
      color: var(--color-text);
    }
    tbody tr:hover {
      background: var(--color-border);
    }
    tbody tr:last-child td {
      border-bottom: none;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 99px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: capitalize;
    }
    .badge-success { background: #064e3b; color: #6ee7b7; }
    .badge-warning { background: #78350f; color: #fcd34d; }
    .badge-error { background: #7f1d1d; color: #fca5a5; }
    .badge-info { background: #1e3a8a; color: #93c5fd; }
    .badge-default { background: var(--color-border); color: var(--color-text-muted); }
    .image-thumbnail {
      width: 48px;
      height: 48px;
      object-fit: cover;
      border-radius: 6px;
      border: 1px solid var(--color-border);
    }
    .actions-cell {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .btn-action {
      padding: 4px 10px;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      font-size: 0.75rem;
      font-weight: 500;
      transition: opacity 0.15s;
    }
    .btn-action:hover {
      opacity: 0.8;
    }
    .btn-primary {
      background: var(--color-accent);
      color: white;
    }
    .btn-secondary {
      background: var(--color-border);
      color: var(--color-text);
    }
    .btn-danger {
      background: #7f1d1d;
      color: #fca5a5;
    }
    .table-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-top: 1px solid var(--color-border);
      background: var(--color-surface);
    }
    .pagination {
      display: flex;
      gap: 4px;
      align-items: center;
    }
    .btn-page {
      padding: 6px 12px;
      border: 1px solid var(--color-border);
      border-radius: 4px;
      background: var(--color-bg);
      color: var(--color-text);
      cursor: pointer;
      font-size: 0.875rem;
    }
    .btn-page:hover:not(:disabled) {
      background: var(--color-border);
    }
    .btn-page:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-page.active {
      background: var(--color-accent);
      color: white;
      border-color: var(--color-accent);
    }
    .page-info {
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }
    .empty-state {
      padding: 48px;
      text-align: center;
      color: var(--color-text-muted);
    }
    .loading-state {
      padding: 48px;
      text-align: center;
      color: var(--color-text-muted);
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--color-border);
      border-top-color: var(--color-accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @media (max-width: 768px) {
      .table-header {
        flex-direction: column;
        align-items: stretch;
      }
      .search-box {
        max-width: none;
      }
      .filters {
        flex-wrap: wrap;
      }
      table {
        font-size: 0.75rem;
      }
      th, td {
        padding: 8px 12px;
      }
    }
  `]
})
export class DataTableComponent {
  data = input<any[]>([]);
  columns = input.required<TableColumn[]>();
  actions = input<TableAction[]>([]);
  loading = input(false);
  sortable = input(true);
  filterable = input(true);
  pageSize = input(10);

  sortChange = output<{ column: string; direction: 'asc' | 'desc' }>();
  filterChange = output<{ search: string }>();
  pageChange = output<number>();

  sortColumn = signal<string>('');
  sortDirection = signal<'asc' | 'desc'>('asc');
  currentPage = signal(1);
  searchQuery = signal('');

  onSort(column: string) {
    const col = this.columns().find(c => c.key === column);
    if (!col?.sortable || !this.sortable()) return;

    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
    this.sortChange.emit({ column, direction: this.sortDirection() });
  }

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.filterChange.emit({ search: value });
  }

  onPageChange(page: number) {
    this.pageChange.emit(page);
  }

  getSortedData(): any[] {
    return this.data();
  }

  getBadgeClass(value: any, column: TableColumn): string {
    if (column.badgeClass) {
      return column.badgeClass(value);
    }
    const str = String(value).toLowerCase();
    if (['active', 'available', 'success', 'completed'].includes(str)) return 'badge-success';
    if (['pending', 'warning', 'out_of_stock'].includes(str)) return 'badge-warning';
    if (['inactive', 'error', 'failed', 'deleted'].includes(str)) return 'badge-error';
    if (['info', 'new', 'featured'].includes(str)) return 'badge-info';
    return 'badge-default';
  }

  getImageSrc(value: any): string {
    if (Array.isArray(value)) return value[0] ?? '';
    return value ?? '';
  }

  formatValue(value: any, column: TableColumn, row: any): string {
    if (column.formatter) {
      return column.formatter(value, row);
    }
    if (column.type === 'date' && value) {
      return new Date(value).toLocaleDateString();
    }
    if (column.type === 'currency' && typeof value === 'number') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    }
    if (column.type === 'number' && typeof value === 'number') {
      return value.toLocaleString();
    }
    return String(value ?? '');
  }
}
