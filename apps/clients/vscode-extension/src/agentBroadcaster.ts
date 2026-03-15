import type { AgentStatus } from '@token-town/shared';
import { ClientEventType } from '@token-town/shared';

import { WS_ACTIVITY_THROTTLE_MS } from './constants.js';
import type { TokenTownWsClient } from './wsClient.js';

// ── Types ────────────────────────────────────────────────────

interface AgentActivityState {
  agentLocalId: number;
  status: AgentStatus;
  currentTool?: string;
  toolStatus?: string;
  hasPermissionWait?: boolean;
}

// ── AgentBroadcaster ─────────────────────────────────────────

export class AgentBroadcaster {
  private pendingActivity = new Map<number, AgentActivityState>();
  private throttleTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly wsClient: TokenTownWsClient) {}

  // ── Agent lifecycle (immediate) ──────────────────────────

  /** Broadcast that a new agent was created. */
  agentCreated(agentLocalId: number, palette: number, hueShift: number): void {
    this.wsClient.send({
      event: ClientEventType.AGENT_CREATED,
      agentLocalId,
      palette,
      hueShift,
    });
  }

  /** Broadcast that an agent was closed. */
  agentClosed(agentLocalId: number): void {
    this.wsClient.send({
      event: ClientEventType.AGENT_CLOSED,
      agentLocalId,
    });
  }

  // ── Subagent lifecycle (immediate) ───────────────────────

  /** Broadcast that a subagent was created. */
  subagentCreated(parentAgentLocalId: number, parentToolId: string, label: string): void {
    this.wsClient.send({
      event: ClientEventType.SUBAGENT_CREATED,
      parentAgentLocalId,
      parentToolId,
      label,
    });
  }

  /** Broadcast that a subagent was closed. */
  subagentClosed(parentAgentLocalId: number, parentToolId: string): void {
    this.wsClient.send({
      event: ClientEventType.SUBAGENT_CLOSED,
      parentAgentLocalId,
      parentToolId,
    });
  }

  // ── Agent activity (throttled 500ms) ─────────────────────

  /** Queue an activity update. Only the latest per agent is sent. */
  updateActivity(
    agentLocalId: number,
    status: AgentStatus,
    currentTool?: string,
    toolStatus?: string,
    hasPermissionWait?: boolean,
  ): void {
    this.pendingActivity.set(agentLocalId, {
      agentLocalId,
      status,
      currentTool,
      toolStatus,
      hasPermissionWait,
    });
    if (!this.throttleTimer) {
      this.throttleTimer = setTimeout(() => this.flushActivity(), WS_ACTIVITY_THROTTLE_MS);
    }
  }

  /** Re-emit current state of all known agents (e.g. on reconnect). */
  rebroadcastAll(agentStates: Map<number, AgentActivityState>): void {
    for (const state of agentStates.values()) {
      this.wsClient.send({
        event: ClientEventType.AGENT_ACTIVITY,
        ...state,
      });
    }
  }

  /** Clean up. */
  dispose(): void {
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
      this.throttleTimer = null;
    }
    this.pendingActivity.clear();
  }

  // ── Private ──────────────────────────────────────────────

  private flushActivity(): void {
    this.throttleTimer = null;
    for (const state of this.pendingActivity.values()) {
      this.wsClient.send({
        event: ClientEventType.AGENT_ACTIVITY,
        ...state,
      });
    }
    this.pendingActivity.clear();
  }
}
