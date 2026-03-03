"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { onValue, ref, runTransaction, set, update } from "firebase/database";

import { PokemonSelector, type PokemonSelection } from "@/components/pokemon-selector";
import { generateId, generateRandomSecret, sha256Hex } from "@/lib/crypto";
import { ensureAnonymousAuth } from "@/lib/firebase-auth";
import { getFirebaseDatabase } from "@/lib/firebase";
import { getGameById, getRoutesForGame } from "@/lib/games";
import { EncounterPayloadSchema, JoinPlayerPayloadSchema } from "@/lib/schemas";
import {
  getHostSecret,
  getPlayerIdentity,
  savePlayerIdentity,
  touchRecentRun,
} from "@/lib/storage";
import { getDeathPropagationUpdate } from "@/lib/death-propagation";
import type { EncounterRecord, EncounterStatus, RunData } from "@/lib/types";

const MAX_PLAYERS = 2;

interface EncounterEditorInput {
  selection: PokemonSelection | null;
  nickname: string;
  status: EncounterStatus;
}

interface EncounterEditorProps {
  playerName: string;
  encounter?: EncounterRecord;
  editable: boolean;
  isSaving: boolean;
  onSave: (input: EncounterEditorInput) => Promise<void>;
}

function formatRelativeTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

function EncounterEditor({
  playerName,
  encounter,
  editable,
  isSaving,
  onSave,
}: EncounterEditorProps) {
  const [selection, setSelection] = useState<PokemonSelection | null>(() =>
    encounter
      ? {
          speciesId: encounter.speciesId,
          speciesName: encounter.speciesName,
          spriteUrl: encounter.spriteUrl,
        }
      : null,
  );
  const [nickname, setNickname] = useState(() => encounter?.nickname ?? "");
  const [status, setStatus] = useState<EncounterStatus>(() => encounter?.status ?? "alive");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selection) {
      setError("Select a Pokemon first.");
      return;
    }

    setError(null);

    try {
      await onSave({
        selection,
        nickname,
        status,
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to save encounter.");
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">{playerName}</p>
        <span
          className={`rounded-full px-2 py-1 text-xs font-semibold uppercase ${
            (encounter?.status ?? status) === "dead"
              ? "bg-rose-100 text-rose-700"
              : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {encounter?.status ?? status}
        </span>
      </div>

      {selection?.spriteUrl ? (
        <Image
          src={selection.spriteUrl}
          alt={selection.speciesName}
          width={80}
          height={80}
          className="mt-3 h-20 w-20 rounded-lg border border-slate-200 bg-slate-50 p-1"
          unoptimized
        />
      ) : (
        <div className="mt-3 h-20 w-20 rounded-lg border border-dashed border-slate-300 bg-slate-50" />
      )}

      <form onSubmit={handleSubmit} className="mt-3 space-y-3">
        {editable ? (
          <PokemonSelector value={selection} onSelect={setSelection} disabled={!editable || isSaving} />
        ) : (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pokemon</p>
            <p className="mt-1 text-sm text-slate-800">{selection ? selection.speciesName : "Not set"}</p>
          </div>
        )}

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Nickname
          </label>
          <input
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            disabled={!editable || isSaving}
            maxLength={30}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-70"
            placeholder="Optional"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Status
          </label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as EncounterStatus)}
            disabled={!editable || isSaving}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <option value="alive">Alive</option>
            <option value="dead">Dead</option>
          </select>
        </div>

        {encounter?.updatedAt ? (
          <p className="text-xs text-slate-500">Updated: {formatRelativeTimestamp(encounter.updatedAt)}</p>
        ) : null}

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        {editable ? (
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? "Saving..." : "Save Encounter"}
          </button>
        ) : (
          <p className="text-xs text-slate-500">Read-only</p>
        )}
      </form>
    </div>
  );
}

export default function RunPage() {
  const params = useParams<{ runId: string }>();
  const runIdParam = params?.runId;
  const runId = Array.isArray(runIdParam) ? runIdParam[0] : runIdParam;

  const [runData, setRunData] = useState<RunData | null>(null);
  const [authUid, setAuthUid] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [isIdentityLoading, setIsIdentityLoading] = useState(true);
  const [isHost, setIsHost] = useState(false);
  const [joinName, setJoinName] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [savingRouteId, setSavingRouteId] = useState<string | null>(null);
  const [isUpdatingHostAction, setIsUpdatingHostAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [inviteCopyStatus, setInviteCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const autoPropagatingRoutesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let isCancelled = false;

    const signIn = async () => {
      try {
        setIsAuthLoading(true);
        const user = await ensureAnonymousAuth();

        if (!isCancelled) {
          setAuthUid(user.uid);
          setError(null);
        }
      } catch (caughtError) {
        if (!isCancelled) {
          const message =
            caughtError instanceof Error ? caughtError.message : "Failed to authenticate.";
          setError(message);
        }
      } finally {
        if (!isCancelled) {
          setIsAuthLoading(false);
        }
      }
    };

    void signIn();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!runId) {
      setError("Invalid run ID.");
      setIsLoading(false);
      return;
    }

    if (!authUid) {
      setIsLoading(true);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    try {
      const database = getFirebaseDatabase();
      const runRef = ref(database, `runs/${runId}`);

      unsubscribe = onValue(
        runRef,
        (snapshot) => {
          setRunData(snapshot.exists() ? (snapshot.val() as RunData) : null);
          setError(null);
          setIsLoading(false);
        },
        (snapshotError) => {
          setError(snapshotError.message);
          setIsLoading(false);
        },
      );
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to connect to run.");
      setIsLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [runId, authUid]);

  useEffect(() => {
    if (!runId || !runData || !authUid) {
      setCurrentPlayerId(null);
      setIsHost(false);
      setIsIdentityLoading(false);
      return;
    }

    let isCancelled = false;

    const verifyIdentity = async () => {
      setIsIdentityLoading(true);
      const storedIdentity = getPlayerIdentity(runId);
      let verifiedPlayerId: string | null = null;

      if (storedIdentity && runData.players?.[storedIdentity.playerId]) {
        const expectedPlayer = runData.players[storedIdentity.playerId];
        const expectedHash = expectedPlayer.playerSecretHash;
        const currentHash = await sha256Hex(storedIdentity.playerSecret);

        if (currentHash === expectedHash && expectedPlayer.authUid === authUid) {
          verifiedPlayerId = storedIdentity.playerId;
        }
      }

      let hostVerified = false;
      const hostSecret = getHostSecret(runId);

      if (hostSecret && runData.meta?.hostSecretHash) {
        const hostHash = await sha256Hex(hostSecret);
        hostVerified = hostHash === runData.meta.hostSecretHash && runData.meta.hostAuthUid === authUid;
      }

      if (!isCancelled) {
        setCurrentPlayerId(verifiedPlayerId);
        setIsHost(hostVerified);
        setIsIdentityLoading(false);
      }
    };

    void verifyIdentity();

    return () => {
      isCancelled = true;
    };
  }, [runId, runData, authUid]);

  useEffect(() => {
    if (!runId || !runData?.meta?.gameId) {
      return;
    }

    touchRecentRun(runId, runData.meta.gameId);
  }, [runId, runData?.meta?.gameId]);

  useEffect(() => {
    if (!runId || !currentPlayerId) {
      return;
    }

    try {
      const database = getFirebaseDatabase();
      void update(ref(database, `runs/${runId}/players/${currentPlayerId}`), {
        lastSeenAt: Date.now(),
      });
    } catch {
      return;
    }
  }, [runId, currentPlayerId]);

  const players = useMemo(() => {
    return Object.entries(runData?.players ?? {}).sort(([, a], [, b]) => a.createdAt - b.createdAt);
  }, [runData?.players]);

  const game = runData ? getGameById(runData.meta.gameId) : undefined;
  const routes = runData ? getRoutesForGame(runData.meta.gameId) : [];
  const isRunFull = players.length >= MAX_PLAYERS;
  const isRunClosed = runData?.meta.status === "CLOSED";
  const canEdit = Boolean(currentPlayerId) && !isRunClosed;
  const inviteLink =
    typeof window !== "undefined" && runId ? `${window.location.origin}/run/${runId}` : "";

  useEffect(() => {
    if (!runId || !runData || !currentPlayerId || isRunClosed || !runData.settings.deathPropagationEnabled) {
      return;
    }

    const otherPlayerId = players.find(([playerId]) => playerId !== currentPlayerId)?.[0];

    if (!otherPlayerId) {
      return;
    }

    const database = getFirebaseDatabase();
    const routeEntries = Object.entries(runData.routes ?? {});

    for (const [routeId, routeRecord] of routeEntries) {
      const ownEncounter = routeRecord.encounters?.[currentPlayerId];
      const otherEncounter = routeRecord.encounters?.[otherPlayerId];

      if (!ownEncounter || !otherEncounter) {
        continue;
      }

      if (ownEncounter.status !== "alive" || otherEncounter.status !== "dead") {
        continue;
      }

      if (autoPropagatingRoutesRef.current.has(routeId)) {
        continue;
      }

      autoPropagatingRoutesRef.current.add(routeId);
      const ownEncounterRef = ref(database, `runs/${runId}/routes/${routeId}/encounters/${currentPlayerId}`);

      void runTransaction(ownEncounterRef, (currentValue) => {
        const updateValue = getDeathPropagationUpdate(currentValue, otherEncounter.updatedAt);
        return updateValue ?? currentValue;
      }).finally(() => {
        autoPropagatingRoutesRef.current.delete(routeId);
      });
    }
  }, [runId, runData, currentPlayerId, players, isRunClosed]);

  const handleJoin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!runId || !runData) {
      return;
    }

    if (!authUid) {
      setJoinError("Authentication is not ready yet.");
      return;
    }

    const trimmedName = joinName.trim();

    if (!trimmedName) {
      setJoinError("Name is required.");
      return;
    }

    if (isRunClosed) {
      setJoinError("Run is closed.");
      return;
    }

    if (Object.keys(runData.players ?? {}).length >= MAX_PLAYERS) {
      setJoinError("Run is full (2 players).");
      return;
    }

    setIsJoining(true);
    setJoinError(null);

    try {
      const database = getFirebaseDatabase();
      const playerId = generateId();
      const playerSecret = generateRandomSecret();
      const playerSecretHash = await sha256Hex(playerSecret);
      const now = Date.now();

      const payload = JoinPlayerPayloadSchema.parse({
        playerId,
        authUid,
        name: trimmedName,
        createdAt: now,
        lastSeenAt: now,
        playerSecretHash,
      });

      let joinAbortReason: "run-missing" | "full" | null = null;
      const joinResult = await runTransaction(ref(database, `runs/${runId}/players`), (currentPlayers) => {
        if (!currentPlayers || typeof currentPlayers !== "object" || Array.isArray(currentPlayers)) {
          joinAbortReason = "run-missing";
          return;
        }

        const playersMap = currentPlayers as Record<string, unknown>;

        if (Object.keys(playersMap).length >= MAX_PLAYERS) {
          joinAbortReason = "full";
          return;
        }

        joinAbortReason = null;
        return {
          ...playersMap,
          [payload.playerId]: {
            authUid: payload.authUid,
            name: payload.name,
            createdAt: payload.createdAt,
            lastSeenAt: payload.lastSeenAt,
            playerSecretHash: payload.playerSecretHash,
          },
        };
      });

      if (!joinResult.committed) {
        if (joinAbortReason === "full") {
          setJoinError("Run is full (2 players).");
        } else {
          setJoinError("Could not join run.");
        }
        return;
      }

      savePlayerIdentity(runId, {
        playerId,
        playerSecret,
      });
      touchRecentRun(runId, runData.meta.gameId);
      setCurrentPlayerId(playerId);
      setJoinName("");
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Could not join run.";

      if (message.toLowerCase().includes("permission_denied")) {
        setJoinError("Run is closed or unavailable.");
      } else {
        setJoinError(message);
      }
    } finally {
      setIsJoining(false);
    }
  };

  const handleCopyInvite = async () => {
    if (!inviteLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteLink);
      setInviteCopyStatus("copied");
      window.setTimeout(() => {
        setInviteCopyStatus("idle");
      }, 1500);
    } catch {
      setInviteCopyStatus("error");
    }
  };

  const handleSaveEncounter = async (routeId: string, input: EncounterEditorInput) => {
    if (!runId || !runData || !currentPlayerId || !input.selection) {
      return;
    }

    const database = getFirebaseDatabase();
    const now = Date.now();

    const payload = EncounterPayloadSchema.parse({
      speciesId: input.selection.speciesId,
      speciesName: input.selection.speciesName,
      spriteUrl: input.selection.spriteUrl,
      nickname: input.nickname.trim() ? input.nickname.trim() : undefined,
      status: input.status,
      updatedAt: now,
    });

    setSavingRouteId(routeId);
    setActionError(null);

    try {
      await set(ref(database, `runs/${runId}/routes/${routeId}/encounters/${currentPlayerId}`), payload);
    } catch (caughtError) {
      setActionError(caughtError instanceof Error ? caughtError.message : "Failed to save encounter.");
      throw caughtError;
    } finally {
      setSavingRouteId(null);
    }
  };

  const handleTogglePropagation = async () => {
    if (!runId || !runData || !isHost) {
      return;
    }

    setIsUpdatingHostAction(true);
    setActionError(null);

    try {
      const database = getFirebaseDatabase();
      await update(ref(database, `runs/${runId}/settings`), {
        deathPropagationEnabled: !runData.settings.deathPropagationEnabled,
      });
    } catch (caughtError) {
      setActionError(caughtError instanceof Error ? caughtError.message : "Could not update settings.");
    } finally {
      setIsUpdatingHostAction(false);
    }
  };

  const handleCloseRun = async () => {
    if (!runId || !isHost || !runData) {
      return;
    }

    setIsUpdatingHostAction(true);
    setActionError(null);

    try {
      const database = getFirebaseDatabase();
      await update(ref(database, `runs/${runId}/meta`), {
        status: "CLOSED",
      });
    } catch (caughtError) {
      setActionError(caughtError instanceof Error ? caughtError.message : "Could not close run.");
    } finally {
      setIsUpdatingHostAction(false);
    }
  };

  if (!runId) {
    return <p className="text-sm text-rose-600">Invalid run ID.</p>;
  }

  if (isAuthLoading) {
    return <p className="text-sm text-slate-600">Connecting...</p>;
  }

  if (error) {
    return <p className="text-sm text-rose-600">{error}</p>;
  }

  if (isLoading) {
    return <p className="text-sm text-slate-600">Loading run...</p>;
  }

  if (!runData) {
    return <p className="text-sm text-slate-600">Run not found.</p>;
  }

  return (
    <div className="space-y-6 py-2">
      <header className="rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Run</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">{game?.name ?? runData.meta.gameId}</h1>
            <p className="mt-2 text-xs text-slate-500">Run ID: {runId}</p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                isRunClosed ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {runData.meta.status}
            </span>

            <button
              type="button"
              onClick={() => void handleCopyInvite()}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-500"
            >
              Copy Invite Link
            </button>
            {inviteCopyStatus === "copied" ? (
              <p className="text-xs text-emerald-700">Invite copied.</p>
            ) : null}
            {inviteCopyStatus === "error" ? (
              <p className="text-xs text-rose-600">Could not copy link.</p>
            ) : null}
          </div>
        </div>

        {isRunClosed ? (
          <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Run closed by host.
          </p>
        ) : null}
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-slate-900">Players</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {players.map(([playerId, player]) => (
            <li
              key={playerId}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
            >
              <p className="font-semibold text-slate-900">
                {player.name}
                {playerId === runData.meta.hostPlayerId ? " (Host)" : ""}
                {playerId === currentPlayerId ? " (You)" : ""}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Last seen: {player.lastSeenAt ? formatRelativeTimestamp(player.lastSeenAt) : "Unknown"}
              </p>
            </li>
          ))}
        </ul>

        {players.length === 0 ? <p className="mt-3 text-sm text-slate-500">No players joined yet.</p> : null}

        {isIdentityLoading ? <p className="mt-4 text-sm text-slate-500">Verifying local identity...</p> : null}

        {!isIdentityLoading && !currentPlayerId && !isRunClosed && !isRunFull ? (
          <form onSubmit={handleJoin} className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label
              htmlFor="join-name"
              className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
            >
              Enter name to join
            </label>
            <input
              id="join-name"
              value={joinName}
              onChange={(event) => setJoinName(event.target.value)}
              maxLength={30}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              placeholder="Player name"
            />

            {joinError ? <p className="mt-2 text-sm text-rose-600">{joinError}</p> : null}

            <button
              type="submit"
              disabled={isJoining}
              className="mt-3 rounded-xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isJoining ? "Joining..." : "Join Run"}
            </button>
          </form>
        ) : null}

        {!isIdentityLoading && !currentPlayerId && isRunFull ? (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Run is full (2 players). You can view in read-only mode.
          </p>
        ) : null}
      </section>

      {isHost ? (
        <section className="rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-slate-900">Host Controls</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleTogglePropagation()}
              disabled={isUpdatingHostAction || isRunClosed}
              className="rounded-xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Death Propagation: {runData.settings.deathPropagationEnabled ? "On" : "Off"}
            </button>
            <button
              type="button"
              onClick={() => void handleCloseRun()}
              disabled={isUpdatingHostAction || isRunClosed}
              className="rounded-xl border border-rose-300 bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Close Run
            </button>
          </div>
        </section>
      ) : null}

      {actionError ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{actionError}</p>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-slate-900">Routes</h2>
        {routes.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No route dataset configured for this game yet.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {routes.map((route) => {
              const encounters = runData.routes?.[route.id]?.encounters ?? {};
              const bothLinked =
                players.length === 2 && players.every(([playerId]) => Boolean(encounters[playerId]?.speciesId));

              return (
                <article key={route.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-base font-semibold text-slate-900">{route.name}</h3>

                  {bothLinked ? (
                    <div className="mt-3 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
                      Linked pair established for this route.
                    </div>
                  ) : null}

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {players.map(([playerId, player]) => (
                      <EncounterEditor
                        key={`${route.id}-${playerId}-${encounters[playerId]?.updatedAt ?? 0}`}
                        playerName={player.name}
                        encounter={encounters[playerId]}
                        editable={Boolean(canEdit && currentPlayerId === playerId)}
                        isSaving={savingRouteId === route.id && currentPlayerId === playerId}
                        onSave={(input) => handleSaveEncounter(route.id, input)}
                      />
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
