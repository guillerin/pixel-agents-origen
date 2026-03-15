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
    path: 'leaderboard',
    loadComponent: () => import('./features/leaderboard/leaderboard.component').then(m => m.LeaderboardComponent),
    canActivate: [authGuard],
  },
  { path: 'login', loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent) },
  { path: '**', redirectTo: 'dashboard' },
];
