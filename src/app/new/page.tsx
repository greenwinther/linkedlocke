"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ref, runTransaction } from "firebase/database";

import { generateId, generateRandomSecret, sha256Hex } from "@/lib/crypto";
import { ensureAnonymousAuth } from "@/lib/firebase-auth";
import { getFirebaseDatabase } from "@/lib/firebase";
import { GAMES } from "@/lib/games";
import { CreateRunPayloadSchema } from "@/lib/schemas";
import { saveHostSecret, savePlayerIdentity, touchRecentRun } from "@/lib/storage";

const CREATE_RUN_MAX_ATTEMPTS = 5;

export default function NewGamePage() {
  const router = useRouter();
  const [selectedGameId, setSelectedGameId] = useState<string>(GAMES[0]?.id ?? "");
  const [playerName, setPlayerName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateRun = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = playerName.trim();

    if (!trimmedName) {
      setError("Player name is required.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const authUser = await ensureAnonymousAuth();
      const database = getFirebaseDatabase();
      let createdRun:
        | {
            runId: string;
            hostPlayerId: string;
            playerSecret: string;
            hostSecret: string;
          }
        | null = null;

      for (let attempt = 0; attempt < CREATE_RUN_MAX_ATTEMPTS; attempt += 1) {
        const runId = generateId();
        const hostPlayerId = generateId();
        const playerSecret = generateRandomSecret();
        const hostSecret = generateRandomSecret();
        const [playerSecretHash, hostSecretHash] = await Promise.all([
          sha256Hex(playerSecret),
          sha256Hex(hostSecret),
        ]);
        const now = Date.now();

        const payload = CreateRunPayloadSchema.parse({
          runId,
          meta: {
            createdAt: now,
            status: "OPEN",
            gameId: selectedGameId,
            hostPlayerId,
            hostAuthUid: authUser.uid,
            hostSecretHash,
          },
          settings: {
            deathPropagationEnabled: true,
          },
          hostPlayer: {
            playerId: hostPlayerId,
            authUid: authUser.uid,
            name: trimmedName,
            createdAt: now,
            lastSeenAt: now,
            playerSecretHash,
          },
        });

        const createResult = await runTransaction(
          ref(database, `runs/${payload.runId}`),
          (currentRun) => {
            if (currentRun !== null) {
              return;
            }

            return {
              meta: payload.meta,
              settings: payload.settings,
              players: {
                [payload.hostPlayer.playerId]: {
                  authUid: payload.hostPlayer.authUid,
                  name: payload.hostPlayer.name,
                  createdAt: payload.hostPlayer.createdAt,
                  lastSeenAt: payload.hostPlayer.lastSeenAt,
                  playerSecretHash: payload.hostPlayer.playerSecretHash,
                },
              },
            };
          },
        );

        if (createResult.committed) {
          createdRun = {
            runId: payload.runId,
            hostPlayerId: payload.hostPlayer.playerId,
            playerSecret,
            hostSecret,
          };
          break;
        }
      }

      if (!createdRun) {
        throw new Error("Could not create a unique run ID. Please try again.");
      }

      savePlayerIdentity(createdRun.runId, {
        playerId: createdRun.hostPlayerId,
        playerSecret: createdRun.playerSecret,
      });
      saveHostSecret(createdRun.runId, createdRun.hostSecret);
      touchRecentRun(createdRun.runId, selectedGameId);

      router.push(`/run/${createdRun.runId}`);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Failed to create run. Try again.";
      setError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl py-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">New Game</h1>
      <p className="mt-2 text-sm text-slate-600">Pick a game and create your Soul Link run.</p>

      <form onSubmit={handleCreateRun} className="mt-8 space-y-6 rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-xl">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Choose Game</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {GAMES.map((game) => {
              const isSelected = selectedGameId === game.id;

              return (
                <button
                  type="button"
                  key={game.id}
                  onClick={() => setSelectedGameId(game.id)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    isSelected
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-900 hover:border-slate-400"
                  }`}
                >
                  <span className="block text-base font-semibold">{game.name}</span>
                  <span className={`mt-1 block text-xs ${isSelected ? "text-slate-200" : "text-slate-500"}`}>
                    {game.subtitle}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="player-name" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Your Player Name
          </label>
          <input
            id="player-name"
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            required
            maxLength={30}
            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-600 focus:ring-2 focus:ring-slate-200"
            placeholder="Enter your name"
          />
        </div>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-2xl border border-slate-900 bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Creating..." : "Create Run"}
          </button>
        </div>
      </form>
    </div>
  );
}
