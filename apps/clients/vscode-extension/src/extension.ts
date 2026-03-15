import * as path from 'path';
import * as vscode from 'vscode';

import { AgentBroadcaster } from './agentBroadcaster.js';
import { COMMAND_EXPORT_DEFAULT_LAYOUT, COMMAND_SHOW_PANEL, VIEW_ID } from './constants.js';
import { EconomyClient } from './economyClient.js';
import { PixelAgentsViewProvider } from './PixelAgentsViewProvider.js';
import { extractTokenUsage, TokenReporter } from './tokenReporter.js';
import { setTokenUsageCallback } from './transcriptParser.js';
import { TokenTownWsClient } from './wsClient.js';

let providerInstance: PixelAgentsViewProvider | undefined;

export function activate(context: vscode.ExtensionContext) {
  // ── Multiplayer services ────────────────────────────────
  const wsClient = new TokenTownWsClient(context.secrets);
  const economyClient = new EconomyClient();
  const tokenReporter = new TokenReporter(
    context.globalState,
    () => economyClient.getAuthToken(),
  );
  const agentBroadcaster = new AgentBroadcaster(wsClient);

  // Hook token usage extraction into transcript parsing
  setTokenUsageCallback((_agentId, record) => {
    const result = extractTokenUsage(record);
    if (result) {
      // Derive sessionId from the agent's JSONL filename
      const agent = providerInstance?.agents.get(_agentId);
      const sessionId = agent
        ? path.basename(agent.jsonlFile, '.jsonl')
        : 'unknown';
      tokenReporter.reportUsage(sessionId, result.requestId, result.usage);
    }
  });

  // Connect and register on WS open
  const onConnected = wsClient.on('_connected', async () => {
    try {
      const machineId = vscode.env.machineId;
      const result = await economyClient.register(machineId);
      await wsClient.setSessionToken(result.sessionToken);
      tokenReporter.start();
      console.log('[TokenTown] Registered, userId:', result.userId);
    } catch (err) {
      console.error('[TokenTown] Registration failed:', err);
    }
  });

  // Listen for coin updates from WS and forward to webview
  const onCoinsUpdate = wsClient.on('coins_update', (data) => {
    const coins = data.coins as number | undefined;
    if (coins !== undefined) {
      providerInstance?.postMessageToWebview({ type: 'coinsUpdate', coins });
    }
  });

  wsClient.connect().catch((err) => {
    console.error('[TokenTown] WS connect error:', err);
  });

  // ── View provider ──────────────────────────────────────
  const provider = new PixelAgentsViewProvider(context, {
    tokenReporter,
    agentBroadcaster,
  });
  providerInstance = provider;

  context.subscriptions.push(vscode.window.registerWebviewViewProvider(VIEW_ID, provider));

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_SHOW_PANEL, () => {
      vscode.commands.executeCommand(`${VIEW_ID}.focus`);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_EXPORT_DEFAULT_LAYOUT, () => {
      provider.exportDefaultLayout();
    }),
  );

  // ── Disposal ───────────────────────────────────────────
  context.subscriptions.push(
    new vscode.Disposable(() => {
      setTokenUsageCallback(null);
      onConnected.dispose();
      onCoinsUpdate.dispose();
      agentBroadcaster.dispose();
      tokenReporter.dispose();
      economyClient.dispose();
      wsClient.dispose();
    }),
  );
}

export function deactivate() {
  providerInstance?.dispose();
}
