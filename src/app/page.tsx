"use client";

import Link from "next/link";

import { getGameById } from "@/lib/games";
import { getRecentRuns, type RecentRun } from "@/lib/storage";

function formatLastOpened(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

export default function HomePage() {
  const recentRuns: RecentRun[] = getRecentRuns();
  const hasRecentRuns = recentRuns.length > 0;
  const latestRun = recentRuns[0];

  return (
    <div className="mx-auto flex min-h-[78vh] w-full max-w-3xl flex-col justify-center">
      <section className="rounded-3xl border border-slate-200/90 bg-white/80 p-8 shadow-xl shadow-slate-300/20 backdrop-blur sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">LinkedLocke</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Soul Link Tracker
        </h1>

        <div className="mt-8 grid gap-3">
          {latestRun ? (
            <Link
              href={`/run/${latestRun.runId}`}
              className="rounded-2xl border border-slate-300 bg-slate-100 px-5 py-3 text-left text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-200"
            >
              Continue
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="rounded-2xl border border-slate-200 bg-slate-100 px-5 py-3 text-left text-sm font-semibold text-slate-500"
            >
              Continue
            </button>
          )}
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

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
          {hasRecentRuns && latestRun ? (
            <p className="text-sm text-slate-600">
              Latest run:{" "}
              <span className="font-semibold text-slate-800">
                {latestRun.runTitle ?? getGameById(latestRun.gameId)?.name ?? latestRun.gameId}
              </span>{" "}
              <span className="text-xs text-slate-500">({formatLastOpened(latestRun.lastOpenedAt)})</span>
            </p>
          ) : (
            <p className="text-sm text-slate-500">No recent runs yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
