"use client";

import Link from "next/link";
import { useState } from "react";

import { getGameById } from "@/lib/games";
import { getRecentRuns, type RecentRun } from "@/lib/storage";

function formatLastOpened(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

export default function HomePage() {
  const [showContinue, setShowContinue] = useState(false);
  const [recentRuns] = useState<RecentRun[]>(() => getRecentRuns());
  const hasRecentRuns = recentRuns.length > 0;

  return (
    <div className="mx-auto flex min-h-[78vh] w-full max-w-3xl flex-col justify-center">
      <section className="rounded-3xl border border-slate-200/90 bg-white/80 p-8 shadow-xl shadow-slate-300/20 backdrop-blur sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">LinkedLocke</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Soul Link Tracker
        </h1>

        <div className="mt-8 grid gap-3">
          <button
            type="button"
            onClick={() => setShowContinue((value) => !value)}
            className="rounded-2xl border border-slate-300 bg-slate-100 px-5 py-3 text-left text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-200"
          >
            Continue
          </button>
          <Link
            href="/new"
            className="rounded-2xl border border-slate-900 bg-slate-900 px-5 py-3 text-left text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            New Game
          </Link>
          <Link
            href="/load"
            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-left text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-100"
          >
            Load Game
          </Link>
        </div>

        {showContinue ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-700">Recent Runs</p>
            {hasRecentRuns ? (
              <ul className="mt-3 space-y-2">
                {recentRuns.map((run) => {
                  const game = getGameById(run.gameId);
                  return (
                    <li key={run.runId}>
                      <Link
                        href={`/run/${run.runId}`}
                        className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm transition hover:border-slate-400 hover:bg-slate-100"
                      >
                        <span>
                          <span className="block font-semibold text-slate-800">
                            {game?.name ?? run.gameId}
                          </span>
                          <span className="block text-xs text-slate-500">Run ID: {run.runId}</span>
                        </span>
                        <span className="text-xs text-slate-500">{formatLastOpened(run.lastOpenedAt)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">No recent runs yet.</p>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
