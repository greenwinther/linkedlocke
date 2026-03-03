"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { parseRunId } from "@/lib/run-id";

export default function LoadGamePage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const runId = parseRunId(input);

    if (!runId) {
      setError("Enter a valid run URL or run ID.");
      return;
    }

    setError(null);
    router.push(`/run/${runId}`);
  };

  return (
    <div className="mx-auto max-w-2xl py-8">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Load Game</h1>
      <p className="mt-2 text-sm text-slate-600">Paste an invite link or run ID to open a run.</p>

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

        <button
          type="submit"
          className="mt-5 rounded-2xl border border-slate-900 bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Open Run
        </button>
      </form>
    </div>
  );
}
