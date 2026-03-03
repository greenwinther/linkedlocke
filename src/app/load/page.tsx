"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ref, remove } from "firebase/database";

import { ensureAnonymousAuth } from "@/lib/firebase-auth";
import { getFirebaseDatabase } from "@/lib/firebase";
import { getGameById } from "@/lib/games";
import { parseRunId } from "@/lib/run-id";
import { clearRunLocalState, getRecentRuns, removeRecentRun, type RecentRun } from "@/lib/storage";

function formatLastOpened(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

export default function LoadGamePage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>(() => getRecentRuns());
  const [error, setError] = useState<string | null>(null);
  const [isDeletingRunId, setIsDeletingRunId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const runId = parseRunId(input);

    if (!runId) {
      setError("Enter a valid run URL or run ID.");
      return;
    }

    setActionNotice(null);
    setError(null);
    router.push(`/run/${runId}`);
  };

  const handleDeleteRun = async (run: RecentRun) => {
    const confirmed = window.confirm(
      `Delete run "${run.runTitle ?? run.runId}"?\n\nThis will remove the run from Firebase and clear local run identity for this run.`,
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setActionNotice(null);
    setIsDeletingRunId(run.runId);

    try {
      await ensureAnonymousAuth();
      const database = getFirebaseDatabase();

      await remove(ref(database, `runs/${run.runId}`));
      removeRecentRun(run.runId);
      clearRunLocalState(run.runId);
      setRecentRuns((current) => current.filter((item) => item.runId !== run.runId));

      setActionNotice("Run deleted.");
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Could not delete run.";

      if (message.toLowerCase().includes("permission_denied")) {
        setError("Only the host can delete this run.");
      } else {
        setError(message);
      }
    } finally {
      setIsDeletingRunId(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl py-8">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Load Game</h1>
      <p className="mt-2 text-sm text-slate-600">Open a recent run, or paste an invite link/run ID.</p>

      <form onSubmit={handleSubmit} className="mt-8 rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-lg">
        <label htmlFor="run-input" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Invite URL or Run ID
        </label>
        <input
          id="run-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-600 focus:ring-2 focus:ring-slate-200"
          placeholder="https://your-app/run/abc123 or abc123"
        />

        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        {actionNotice ? <p className="mt-3 text-sm text-emerald-700">{actionNotice}</p> : null}

        <button
          type="submit"
          className="mt-5 rounded-2xl border border-slate-900 bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Open Run
        </button>
      </form>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-lg">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">All Recent Runs</h2>

        {recentRuns.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No runs found yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {recentRuns.map((run) => {
              const game = getGameById(run.gameId);

              return (
                <li key={run.runId}>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm transition hover:border-slate-400 hover:bg-slate-100">
                    <button
                      type="button"
                      onClick={() => router.push(`/run/${run.runId}`)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block truncate font-semibold text-slate-800">
                        {run.runTitle ?? game?.name ?? run.gameId}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {game?.name ?? run.gameId} | Run ID: {run.runId}
                      </span>
                    </button>

                    <span className="whitespace-nowrap text-xs text-slate-500">{formatLastOpened(run.lastOpenedAt)}</span>

                    <button
                      type="button"
                      onClick={() => void handleDeleteRun(run)}
                      disabled={isDeletingRunId === run.runId}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                      aria-label={`Delete ${run.runTitle ?? run.runId}`}
                    >
                      {isDeletingRunId === run.runId ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
