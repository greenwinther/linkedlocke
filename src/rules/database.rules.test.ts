// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { ref, set, update } from "firebase/database";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

const PROJECT_ID = "demo-linkedlocke-rules";
const EMULATOR_HOST = "127.0.0.1";
const EMULATOR_PORT = 9000;
const NOW = 1_700_000_000_000;

const rules = readFileSync(resolve(process.cwd(), "database.rules.json"), "utf8");

function makePlayer(authUid: string, name: string, createdAt: number) {
  return {
    authUid,
    name,
    createdAt,
    lastSeenAt: createdAt,
    playerSecretHash: "b".repeat(64),
  };
}

function makeRun(hostUid: string, hostPlayerId: string) {
  return {
    meta: {
      createdAt: NOW,
      status: "OPEN",
      gameId: "firered_leafgreen",
      hostPlayerId,
      hostAuthUid: hostUid,
      hostSecretHash: "a".repeat(64),
    },
    settings: {
      deathPropagationEnabled: true,
    },
    players: {
      [hostPlayerId]: makePlayer(hostUid, "Host", NOW),
    },
  };
}

function makeEncounter(updatedAt: number) {
  return {
    speciesId: 1,
    speciesName: "bulbasaur",
    status: "alive",
    updatedAt,
  };
}

describe("database.rules.json", () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      database: {
        host: EMULATOR_HOST,
        port: EMULATOR_PORT,
        rules,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearDatabase();
  });

  it("allows host create and second-player join using full players-map write", async () => {
    const runId = "run-create-join";
    const hostUid = "uid-host";
    const guestUid = "uid-guest";
    const hostPlayerId = "player-host";
    const guestPlayerId = "player-guest";

    const hostDb = testEnv.authenticatedContext(hostUid).database();
    await assertSucceeds(set(ref(hostDb, `runs/${runId}`), makeRun(hostUid, hostPlayerId)));

    const guestDb = testEnv.authenticatedContext(guestUid).database();
    await assertSucceeds(
      set(ref(guestDb, `runs/${runId}/players`), {
        [hostPlayerId]: makePlayer(hostUid, "Host", NOW),
        [guestPlayerId]: makePlayer(guestUid, "Guest", NOW + 1),
      }),
    );
  });

  it("allows only host to close a run", async () => {
    const runId = "run-close";
    const hostUid = "uid-host-close";
    const guestUid = "uid-guest-close";
    const hostPlayerId = "player-host-close";

    const hostDb = testEnv.authenticatedContext(hostUid).database();
    await assertSucceeds(set(ref(hostDb, `runs/${runId}`), makeRun(hostUid, hostPlayerId)));

    const guestDb = testEnv.authenticatedContext(guestUid).database();
    await assertFails(update(ref(guestDb, `runs/${runId}/meta`), { status: "CLOSED" }));
    await assertSucceeds(update(ref(hostDb, `runs/${runId}/meta`), { status: "CLOSED" }));
  });

  it("allows only host to delete a run", async () => {
    const runId = "run-delete";
    const hostUid = "uid-host-delete";
    const guestUid = "uid-guest-delete";
    const hostPlayerId = "player-host-delete";

    const hostDb = testEnv.authenticatedContext(hostUid).database();
    const guestDb = testEnv.authenticatedContext(guestUid).database();

    await assertSucceeds(set(ref(hostDb, `runs/${runId}`), makeRun(hostUid, hostPlayerId)));
    await assertFails(set(ref(guestDb, `runs/${runId}`), null));
    await assertSucceeds(set(ref(hostDb, `runs/${runId}`), null));
  });

  it("allows only encounter owner to write while run is open", async () => {
    const runId = "run-owner-encounter";
    const hostUid = "uid-host-owner";
    const guestUid = "uid-guest-owner";
    const hostPlayerId = "player-host-owner";
    const guestPlayerId = "player-guest-owner";

    const hostDb = testEnv.authenticatedContext(hostUid).database();
    await assertSucceeds(set(ref(hostDb, `runs/${runId}`), makeRun(hostUid, hostPlayerId)));

    const guestDb = testEnv.authenticatedContext(guestUid).database();
    await assertSucceeds(
      set(ref(guestDb, `runs/${runId}/players/${guestPlayerId}`), makePlayer(guestUid, "Guest", NOW + 1)),
    );

    await assertFails(
      set(
        ref(hostDb, `runs/${runId}/routes/route-1/encounters/${guestPlayerId}`),
        makeEncounter(NOW + 2),
      ),
    );

    await assertSucceeds(
      set(
        ref(guestDb, `runs/${runId}/routes/route-1/encounters/${guestPlayerId}`),
        makeEncounter(NOW + 3),
      ),
    );
  });

  it("denies encounter writes after host closes the run", async () => {
    const runId = "run-closed-encounter";
    const hostUid = "uid-host-closed";
    const guestUid = "uid-guest-closed";
    const hostPlayerId = "player-host-closed";
    const guestPlayerId = "player-guest-closed";

    const hostDb = testEnv.authenticatedContext(hostUid).database();
    const guestDb = testEnv.authenticatedContext(guestUid).database();

    await assertSucceeds(set(ref(hostDb, `runs/${runId}`), makeRun(hostUid, hostPlayerId)));
    await assertSucceeds(
      set(ref(guestDb, `runs/${runId}/players/${guestPlayerId}`), makePlayer(guestUid, "Guest", NOW + 1)),
    );
    await assertSucceeds(update(ref(hostDb, `runs/${runId}/meta`), { status: "CLOSED" }));

    await assertFails(
      set(
        ref(guestDb, `runs/${runId}/routes/route-2/encounters/${guestPlayerId}`),
        makeEncounter(NOW + 4),
      ),
    );
  });
});
