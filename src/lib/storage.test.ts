import { beforeEach, describe, expect, it } from "vitest";

import {
  getHostSecret,
  getPlayerIdentity,
  getRecentRuns,
  saveHostSecret,
  savePlayerIdentity,
  touchRecentRun,
} from "./storage";

describe("storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("stores and retrieves player identity", () => {
    savePlayerIdentity("run-a", {
      playerId: "player-1",
      playerSecret: "secret-1",
    });

    expect(getPlayerIdentity("run-a")).toEqual({
      playerId: "player-1",
      playerSecret: "secret-1",
    });
  });

  it("stores and retrieves host secret", () => {
    saveHostSecret("run-a", "host-secret");
    expect(getHostSecret("run-a")).toBe("host-secret");
  });

  it("tracks recent runs in recency order with dedupe", () => {
    touchRecentRun("run-a", "emerald");
    touchRecentRun("run-b", "platinum");
    touchRecentRun("run-a", "emerald");

    const recent = getRecentRuns();

    expect(recent).toHaveLength(2);
    expect(recent[0].runId).toBe("run-a");
    expect(recent[0].gameId).toBe("emerald");
    expect(recent[1].runId).toBe("run-b");
  });
});
