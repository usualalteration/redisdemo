/**
 * Redis LiveBoard API client.
 *
 * All dashboard data lives in Redis behind OpenServerless actions
 * (`/api/my/v1/...`). Responses may arrive flat or nested under `body`
 * depending on the platform wrapper, so payloads are normalized here.
 */

export type CounterId = "page_views" | "api_requests" | "active_sessions";

export interface CountersState {
  ok: true;
  op: string;
  counters: Record<CounterId, number>;
  counter?: string;
  value?: number;
  amount?: number;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  score: number;
  rank: number;
}

export interface LeaderboardState {
  ok: true;
  op: string;
  players: Player[];
  total?: number;
  player?: string;
  name?: string;
  awarded?: number;
  score?: number;
}

export interface CacheEntry {
  name: string;
  value: string;
  ttl: number;
}

export interface CacheState {
  ok: true;
  op: string;
  entries: CacheEntry[];
  hits?: number;
  misses?: number;
  hit?: boolean;
  name?: string;
  value?: string;
  entry?: CacheEntry;
  existed?: boolean;
  deleted?: boolean;
}

export type ActivityType = "counter" | "score" | "cache" | "system";

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  message: string;
  detail: string;
  ts: number;
}

export interface ActivityState {
  ok: true;
  events: ActivityEvent[];
  count: number;
  streamLength: number;
}

export interface ServerStats {
  redisVersion: string;
  dbsize: number;
  connectedClients: number;
  usedMemoryBytes: number;
  usedMemoryHuman: string;
  peakMemoryHuman: string;
  uptimeSeconds: number;
}

export interface StatsState {
  ok: true;
  ping: boolean;
  ts: number;
  server: ServerStats | null;
  demo: {
    keys: number;
    cacheHits: number;
    cacheMisses: number;
    hitRate: number | null;
    streamEvents: number;
  };
  activity: {
    bucketMs: number;
    startMs: number;
    counts: number[];
  };
}

const BASE = "/api/my/v1";

async function unwrap<T>(response: Response): Promise<T> {
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Invalid response from server (${response.status})`);
  }
  const raw = payload as Record<string, unknown>;
  const data =
    raw && typeof raw === "object" && "body" in raw && raw.body !== null
      ? (raw.body as Record<string, unknown>)
      : raw;
  const ok = (data as Record<string, unknown>)?.ok;
  const error = (data as Record<string, unknown>)?.error;
  if (!response.ok || ok === false || error) {
    throw new Error(
      (typeof error === "string" && error) || `Request failed (${response.status})`,
    );
  }
  return data as T;
}

async function get<T>(action: string): Promise<T> {
  const response = await fetch(`${BASE}/${action}`);
  return unwrap<T>(response);
}

async function send<T>(
  action: string,
  method: "POST" | "DELETE",
  body?: unknown,
): Promise<T> {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const response = await fetch(`${BASE}/${action}`, init);
  return unwrap<T>(response);
}

export const api = {
  counters: () => get<CountersState>("counters"),
  incrementCounter: (counter: CounterId, amount = 1) =>
    send<CountersState>("counters", "POST", { op: "increment", counter, amount }),
  resetCounter: (counter: CounterId | "all") =>
    send<CountersState>("counters", "POST", { op: "reset", counter }),

  leaderboard: () => get<LeaderboardState>("leaderboard"),
  awardPoints: (player: string) =>
    send<LeaderboardState>("leaderboard", "POST", { op: "award", player }),

  cacheList: () => get<CacheState>("cache"),
  cacheSet: (name: string, value: string, ttl: 30 | 60 | 300) =>
    send<CacheState>("cache", "POST", { op: "set", name, value, ttl }),
  cacheGet: (name: string) =>
    send<CacheState>("cache", "POST", { op: "get", name }),
  cacheDelete: (name: string) =>
    send<CacheState>("cache", "DELETE", { name }),

  activity: () => get<ActivityState>("activity"),

  stats: () => get<StatsState>("stats"),
};

export function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

export function formatUptime(seconds: number): string {
  if (!seconds) return "—";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}