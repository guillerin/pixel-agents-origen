import type { TokenUsage } from '@token-town/shared';
import * as vscode from 'vscode';

import { MAX_OFFLINE_QUEUE, OFFLINE_QUEUE_KEY, WS_TOKEN_BATCH_INTERVAL_MS } from './constants.js';
import { getServerBaseUrl } from './serverUtils.js';

// ── Types ────────────────────────────────────────────────────

interface PendingTokenReport {
  sessionId: string;
  requestId: string;
  usage: TokenUsage;
  timestamp: number;
}

// ── TokenReporter ────────────────────────────────────────────

export class TokenReporter {
  private pending: PendingTokenReport[] = [];
  private batchTimer: ReturnType<typeof setInterval> | null = null;
  private serverUrl: string;

  constructor(
    private readonly globalState: vscode.Memento,
    private readonly getAuthToken: () => string | null,
  ) {
    this.serverUrl = getServerBaseUrl();
  }

  /** Start batching and draining. Call after connect. */
  start(): void {
    if (this.batchTimer) return;
    this.serverUrl = getServerBaseUrl();
    this.batchTimer = setInterval(() => this.flush(), WS_TOKEN_BATCH_INTERVAL_MS);
    // Drain any offline queue immediately
    this.drainOfflineQueue();
  }

  /** Stop batching. */
  stop(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
    // Persist any unflushed reports to offline queue
    if (this.pending.length > 0) {
      this.enqueueOffline(this.pending);
      this.pending = [];
    }
  }

  /** Called from transcriptParser when an assistant record with usage is found. */
  reportUsage(
    sessionId: string,
    requestId: string,
    usage: TokenUsage,
  ): void {
    this.pending.push({
      sessionId,
      requestId,
      usage,
      timestamp: Date.now(),
    });
  }

  /** Clean up resources. */
  dispose(): void {
    this.stop();
  }

  // ── Private ──────────────────────────────────────────────

  private async flush(): Promise<void> {
    if (this.pending.length === 0) return;

    const batch = this.pending.splice(0);
    const token = this.getAuthToken();

    if (!token) {
      // No auth token yet — queue offline
      this.enqueueOffline(batch);
      return;
    }

    try {
      const response = await fetch(`${this.serverUrl}/api/economy/report-tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          reports: batch.map((r) => ({
            sessionId: r.sessionId,
            requestId: r.requestId,
            inputTokens: r.usage.inputTokens,
            outputTokens: r.usage.outputTokens,
            cacheCreationTokens: r.usage.cacheCreationTokens,
            cacheReadTokens: r.usage.cacheReadTokens,
            model: r.usage.model,
            timestamp: r.timestamp,
          })),
        }),
      });

      if (!response.ok) {
        console.error(`[TokenReporter] Server returned ${response.status}`);
        // Re-queue failed reports for retry
        this.enqueueOffline(batch);
      }
    } catch (err) {
      console.error('[TokenReporter] Failed to send token reports:', err);
      this.enqueueOffline(batch);
    }
  }

  private enqueueOffline(reports: PendingTokenReport[]): void {
    const existing = this.globalState.get<PendingTokenReport[]>(OFFLINE_QUEUE_KEY, []);
    const combined = [...existing, ...reports].slice(-MAX_OFFLINE_QUEUE);
    this.globalState.update(OFFLINE_QUEUE_KEY, combined);
  }

  private async drainOfflineQueue(): Promise<void> {
    const queued = this.globalState.get<PendingTokenReport[]>(OFFLINE_QUEUE_KEY, []);
    if (queued.length === 0) return;

    console.log(`[TokenReporter] Draining ${queued.length} offline reports`);
    // Clear the queue first to avoid double-draining
    await this.globalState.update(OFFLINE_QUEUE_KEY, []);
    // Add to pending so they get flushed in the next batch cycle
    this.pending.push(...queued);
  }
}

// ── Helper: Extract token usage from a JSONL assistant record ──

export function extractTokenUsage(
  record: Record<string, unknown>,
): { requestId: string; usage: TokenUsage } | null {
  if (record.type !== 'assistant') return null;

  const message = record.message as Record<string, unknown> | undefined;
  if (!message) return null;

  const usage = message.usage as Record<string, unknown> | undefined;
  if (!usage) return null;

  const requestId = (message.id as string) || (record.requestId as string) || '';
  if (!requestId) return null;

  return {
    requestId,
    usage: {
      inputTokens: (usage.input_tokens as number) ?? 0,
      outputTokens: (usage.output_tokens as number) ?? 0,
      cacheCreationTokens: (usage.cache_creation_input_tokens as number) ?? 0,
      cacheReadTokens: (usage.cache_read_input_tokens as number) ?? 0,
      model: (message.model as string) ?? 'unknown',
    },
  };
}
