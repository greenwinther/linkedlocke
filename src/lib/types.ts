export type RunStatus = "OPEN" | "CLOSED";
export type EncounterStatus = "alive" | "dead";

export interface RunMeta {
  createdAt: number;
  status: RunStatus;
  gameId: string;
  hostPlayerId: string;
  hostSecretHash: string;
}

export interface RunSettings {
  deathPropagationEnabled: boolean;
}

export interface PlayerRecord {
  name: string;
  createdAt: number;
  lastSeenAt: number;
  playerSecretHash: string;
}

export interface EncounterRecord {
  speciesId: number;
  speciesName: string;
  spriteUrl?: string;
  nickname?: string;
  status: EncounterStatus;
  updatedAt: number;
}

export interface RouteRecord {
  encounters?: Record<string, EncounterRecord>;
}

export interface RunData {
  meta: RunMeta;
  settings: RunSettings;
  players?: Record<string, PlayerRecord>;
  routes?: Record<string, RouteRecord>;
}
