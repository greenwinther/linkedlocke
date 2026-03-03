"use client";

import { useEffect, useState } from "react";

import {
  displayPokemonName,
  getPokemonDetailsById,
  searchPokemon,
  type PokemonListEntry,
} from "@/lib/pokeapi";

export interface PokemonSelection {
  speciesId: number;
  speciesName: string;
  spriteUrl?: string;
}

interface PokemonSelectorProps {
  value: PokemonSelection | null;
  onSelect: (selection: PokemonSelection) => void;
  disabled?: boolean;
}

export function PokemonSelector({ value, onSelect, disabled = false }: PokemonSelectorProps) {
  const [query, setQuery] = useState(value ? displayPokemonName(value.speciesName) : "");
  const [results, setResults] = useState<PokemonListEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      return;
    }

    setQuery(displayPokemonName(value.speciesName));
  }, [value]);

  useEffect(() => {
    if (!isOpen || disabled) {
      return;
    }

    let isCancelled = false;

    const loadResults = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const nextResults = await searchPokemon(query, 8);

        if (!isCancelled) {
          setResults(nextResults);
        }
      } catch {
        if (!isCancelled) {
          setError("Could not load Pokemon list.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadResults();

    return () => {
      isCancelled = true;
    };
  }, [query, isOpen, disabled]);

  const handleSelect = async (entry: PokemonListEntry) => {
    try {
      setIsLoading(true);
      const details = await getPokemonDetailsById(entry.id);
      setQuery(displayPokemonName(details.name));
      onSelect({
        speciesId: details.id,
        speciesName: details.name,
        spriteUrl: details.spriteUrl,
      });
      setIsOpen(false);
      setError(null);
    } catch {
      setError("Could not load selected Pokemon.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        Pokemon
      </label>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          window.setTimeout(() => {
            setIsOpen(false);
          }, 120);
        }}
        disabled={disabled}
        placeholder="Search species"
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-70"
      />
      {isOpen ? (
        <div className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {isLoading ? <p className="px-3 py-2 text-sm text-slate-500">Loading...</p> : null}
          {!isLoading && error ? <p className="px-3 py-2 text-sm text-rose-600">{error}</p> : null}
          {!isLoading && !error && results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-500">No matches</p>
          ) : null}
          {!isLoading && !error
            ? results.map((entry) => (
                <button
                  type="button"
                  key={entry.id}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    void handleSelect(entry);
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                >
                  <span>{displayPokemonName(entry.name)}</span>
                  <span className="text-xs text-slate-400">#{entry.id}</span>
                </button>
              ))
            : null}
        </div>
      ) : null}
    </div>
  );
}
