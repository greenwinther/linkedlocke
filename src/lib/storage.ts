export interface RecentRun {
  runId: string;
  gameId: string;
  lastOpenedAt: number;
}

export interface StoredPlayerIdentity {
  playerId: string;
  playerSecret: string;
}

export const RECENT_RUNS_KEY = "linkedlocke:recentRuns";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function runKey(runId: string, suffix: string): string {
  return `linkedlocke:run:${runId}:${suffix}`;
}

function safeParseRecentRuns(rawValue: string | null): RecentRun[] {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((entry): entry is RecentRun => {
        if (!entry || typeof entry !== "object") {
          return false;
        }

        const candidate = entry as Partial<RecentRun>;
        return (
          typeof candidate.runId === "string" &&
          typeof candidate.gameId === "string" &&
          typeof candidate.lastOpenedAt === "number"
        );
      })
      .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
  } catch {
    return [];
  }
}

export function getRecentRuns(): RecentRun[] {
  if (!isBrowser()) {
    return [];
  }

  return safeParseRecentRuns(window.localStorage.getItem(RECENT_RUNS_KEY));
}

export function saveRecentRuns(runs: RecentRun[]): void {
  if (!isBrowser()) {
    return;
  }

  const deduplicated = new Map<string, RecentRun>();

  runs.forEach((run) => {
    deduplicated.set(run.runId, run);
  });

  const normalized = Array.from(deduplicated.values())
    .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
    .slice(0, 20);

  window.localStorage.setItem(RECENT_RUNS_KEY, JSON.stringify(normalized));
}

export function touchRecentRun(runId: string, gameId: string): void {
  const existing = getRecentRuns().filter((item) => item.runId !== runId);

  saveRecentRuns([
    {
      runId,
      gameId,
      lastOpenedAt: Date.now(),
    },
    ...existing,
  ]);
}

export function savePlayerIdentity(runId: string, identity: StoredPlayerIdentity): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(runKey(runId, "playerId"), identity.playerId);
  window.localStorage.setItem(runKey(runId, "playerSecret"), identity.playerSecret);
}

export function getPlayerIdentity(runId: string): StoredPlayerIdentity | null {
  if (!isBrowser()) {
    return null;
  }

  const playerId = window.localStorage.getItem(runKey(runId, "playerId"));
  const playerSecret = window.localStorage.getItem(runKey(runId, "playerSecret"));

  if (!playerId || !playerSecret) {
    return null;
  }

  return {
    playerId,
    playerSecret,
  };
}

export function saveHostSecret(runId: string, hostSecret: string): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(runKey(runId, "hostSecret"), hostSecret);
}

export function getHostSecret(runId: string): string | null {
  if (!isBrowser()) {
    return null;
  }

  return window.localStorage.getItem(runKey(runId, "hostSecret"));
}
