import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard],
  },
  {
    path: 'users',
    loadComponent: () => import('./features/users/users-list.component').then(m => m.UsersListComponent),
    canActivate: [authGuard],
  },
  {
    path: 'shop',
    loadComponent: () => import('./features/shop/shop-items.component').then(m => m.ShopItemsComponent),
    canActivate: [authGuard],
  },
  {
    path: 'shop-admin/categories',
    loadComponent: () => import('./features/shop-admin/categories/categories.component').then(m => m.CategoriesComponent),
    canActivate: [authGuard],
  },
  {
    path: 'shop-admin/products',
    loadComponent: () => import('./features/shop-admin/products/products.component').then(m => m.ProductsComponent),
    canActivate: [authGuard],
  },
  {
    path: 'shop-admin/analytics',
    loadComponent: () => import('./features/shop-admin/analytics/analytics.component').then(m => m.AnalyticsComponent),
    canActivate: [authGuard],
  },
  {
    path: 'leaderboard',
    loadComponent: () => import('./features/leaderboard/leaderboard.component').then(m => m.LeaderboardComponent),
    canActivate: [authGuard],
  },
  { path: 'login', loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent) },
  { path: '**', redirectTo: 'dashboard' },
];
