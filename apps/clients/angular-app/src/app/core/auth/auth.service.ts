import { Injectable, inject } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { Observable, from } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private msal = inject(MsalService);

  get isLoggedIn(): boolean {
    return this.msal.instance.getAllAccounts().length > 0;
  }

  get currentUser() {
    return this.msal.instance.getAllAccounts()[0] ?? null;
  }

  login(): Observable<void> {
    return from(this.msal.instance.loginPopup().then(() => {}));
  }

  logout(): void {
    this.msal.instance.logoutPopup();
  }

  getAccessToken(): Observable<string> {
    const account = this.currentUser;
    if (!account) throw new Error('Not logged in');
    return from(
      this.msal.instance.acquireTokenSilent({
        account,
        scopes: ['openid', 'profile', 'email'],
      }).then(r => r.accessToken)
    );
  }
}
