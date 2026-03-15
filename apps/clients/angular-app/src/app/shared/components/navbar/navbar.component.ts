import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styles: [`
    nav {
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
      padding: 0 24px;
      display: flex;
      align-items: center;
      height: 60px;
      gap: 24px;
    }
    .brand { font-weight: 700; color: var(--color-accent-light); font-size: 1.1rem; margin-right: 16px; }
    a { color: var(--color-text-muted); padding: 4px 8px; border-radius: 4px; }
    a.active, a:hover { color: var(--color-text); background: var(--color-border); }
    .spacer { flex: 1; }
    .user-info { color: var(--color-text-muted); font-size: 0.875rem; }
    button { background: var(--color-accent); color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; }
  `]
})
export class NavbarComponent {
  auth = inject(AuthService);
}
