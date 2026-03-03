import Link from "next/link";

export default function CreditsPage() {
  return (
    <div className="mx-auto max-w-3xl py-8">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Credits and IP Notice</h1>

      <section className="mt-6 space-y-4 rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-lg">
        <p className="text-sm leading-7 text-slate-700">
          LinkedLocke is a fan-made tracker for personal gameplay organization. It is not affiliated with,
          endorsed by, or sponsored by Nintendo, GAME FREAK, or The Pokemon Company.
        </p>
        <p className="text-sm leading-7 text-slate-700">
          Pokemon names and related intellectual property belong to their respective owners.
        </p>
        <p className="text-sm leading-7 text-slate-700">
          Pokemon species data and sprites are provided by{' '}
          <a
            href="https://pokeapi.co/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-slate-800 underline decoration-slate-300 underline-offset-4"
          >
            PokeAPI
          </a>
          .
        </p>
      </section>

      <Link
        href="/"
        className="mt-5 inline-block rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-500"
      >
        Back to Start
      </Link>
    </div>
  );
}
