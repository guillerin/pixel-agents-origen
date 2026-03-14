// ─── Economy ─────────────────────────────────────────────────────────────────

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  model: string;
}

export interface Wallet {
  userId: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
}

export const TransactionType = {
  TOKEN_REWARD: 'token_reward',
  PURCHASE: 'purchase',
  REFUND: 'refund',
  ADMIN_ADJUSTMENT: 'admin_adjustment',
} as const;
export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ShopItem {
  id: string;
  furnitureType: string;
  name: string;
  price: number;
  category: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  isAvailable: boolean;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  machineId: string;
  microsoftId?: string;
  displayName: string;
  email?: string;
  palette: number;
  hueShift: number;
  coins: number;
  totalTokensUsed: number;
  role: 'user' | 'admin';
  createdAt: string;
}

// ─── Agents & Rooms ──────────────────────────────────────────────────────────

export const AgentStatus = {
  IDLE: 'idle',
  ACTIVE: 'active',
  WAITING: 'waiting',
  PERMISSION: 'permission',
} as const;
export type AgentStatus = (typeof AgentStatus)[keyof typeof AgentStatus];

export interface RemoteAgent {
  id: number;
  ownerId: string;
  palette: number;
  hueShift: number;
  seatId: string | null;
  status: AgentStatus;
  currentTool: string | null;
  toolStatus: string | null;
  isSubagent: boolean;
  parentAgentId: number | null;
}

export interface PlayerPresence {
  userId: string;
  displayName: string;
  palette: number;
  hueShift: number;
  joinedAt: string;
  agents: RemoteAgent[];
}

// ─── WebSocket Events ────────────────────────────────────────────────────────

export const ClientEventType = {
  AUTH: 'auth',
  AGENT_ACTIVITY: 'agent:activity',
  AGENT_CREATED: 'agent:created',
  AGENT_CLOSED: 'agent:closed',
  SUBAGENT_CREATED: 'subagent:created',
  SUBAGENT_CLOSED: 'subagent:closed',
  TOKEN_REPORT: 'tokens:report',
  ROOM_SAVE_LAYOUT: 'room:saveLayout',
  ROOM_REQUEST_SNAPSHOT: 'room:requestSnapshot',
  PURCHASE_ITEM: 'shop:purchase',
} as const;
export type ClientEventType = (typeof ClientEventType)[keyof typeof ClientEventType];

export const ServerEventType = {
  ROOM_SNAPSHOT: 'room:snapshot',
  REMOTE_AGENT_ACTIVITY: 'remote:agentActivity',
  REMOTE_AGENT_CREATED: 'remote:agentCreated',
  REMOTE_AGENT_CLOSED: 'remote:agentClosed',
  REMOTE_SUBAGENT_CREATED: 'remote:subagentCreated',
  REMOTE_SUBAGENT_CLOSED: 'remote:subagentClosed',
  COINS_UPDATE: 'economy:coinsUpdate',
  PURCHASE_RESULT: 'economy:purchaseResult',
  PRESENCE_JOINED: 'presence:joined',
  PRESENCE_LEFT: 'presence:left',
  ERROR: 'error',
} as const;
export type ServerEventType = (typeof ServerEventType)[keyof typeof ServerEventType];

// ─── Constants ───────────────────────────────────────────────────────────────

export const TOKENS_PER_COIN = 1000;
export const MAX_PLAYERS_PER_ROOM = 50;
export const HEARTBEAT_INTERVAL_MS = 54_000;
export const RECONNECT_BASE_DELAY_MS = 1_000;
export const RECONNECT_MAX_DELAY_MS = 30_000;
export const TOKEN_WEIGHT_INPUT = 1.0;
export const TOKEN_WEIGHT_OUTPUT = 3.0;
export const TOKEN_WEIGHT_CACHE_CREATION = 1.25;
export const TOKEN_WEIGHT_CACHE_READ = 0.1;
