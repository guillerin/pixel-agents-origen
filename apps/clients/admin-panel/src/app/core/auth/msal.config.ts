import { MsalModule, MsalInterceptor } from '@azure/msal-angular';
import { PublicClientApplication, InteractionType } from '@azure/msal-browser';
import { environment } from '../../../environments/environment';

export const msalInstance = new PublicClientApplication({
  auth: environment.msalConfig.auth,
  cache: { cacheLocation: 'sessionStorage' },
});

export const msalInterceptorConfig = {
  interactionType: InteractionType.Popup,
  protectedResourceMap: new Map([
    [environment.apiUrl, ['openid', 'profile']],
  ]),
};
