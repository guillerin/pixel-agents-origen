import * as vscode from 'vscode';

import { WS_DEFAULT_SERVER_URL } from './constants.js';

/** Derive the HTTP base URL from the configured WebSocket URL. */
export function getServerBaseUrl(): string {
  const config = vscode.workspace.getConfiguration('pixelAgents');
  const wsUrl = config.get<string>('serverUrl') || WS_DEFAULT_SERVER_URL;
  return wsUrl
    .replace(/^wss:/, 'https:')
    .replace(/^ws:/, 'http:')
    .replace(/\/ws\/?$/, '');
}
