export const environment = {
  production: true,
  apiUrl: '/api',
  wsUrl: '/ws',
  msalConfig: {
    auth: {
      clientId: 'YOUR_AZURE_CLIENT_ID',
      authority: 'https://login.microsoftonline.com/YOUR_TENANT_ID',
      redirectUri: 'https://your-domain.com',
    }
  }
};
