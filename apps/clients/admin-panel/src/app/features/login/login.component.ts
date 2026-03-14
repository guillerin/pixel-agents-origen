import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  template: `
    <div style="display:flex;align-items:center;justify-content:center;min-height:80vh;flex-direction:column;gap:24px">
      <h1 style="color:var(--color-accent-light)">Token Town Admin</h1>
      <p style="color:var(--color-text-muted)">Sign in with your Microsoft account to continue</p>
      <button (click)="login()" style="background:var(--color-accent);color:white;border:none;padding:12px 24px;border-radius:6px;font-size:1rem;cursor:pointer">
        Sign in with Microsoft
      </button>
    </div>
  `
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  login() {
    this.auth.login().subscribe(() => this.router.navigate(['/dashboard']));
  }
}
