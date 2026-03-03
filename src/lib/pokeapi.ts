export interface PokemonListEntry {
  id: number;
  name: string;
}

export interface PokemonDetails extends PokemonListEntry {
  spriteUrl?: string;
}

const POKEMON_INDEX_CACHE_KEY = "linkedlocke:pokemon:index:v1";
const POKEMON_INDEX_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

let pokemonIndexCache: PokemonListEntry[] | null = null;
const pokemonDetailsCache = new Map<number, PokemonDetails>();

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function parsePokemonId(resourceUrl: string): number | null {
  const match = resourceUrl.match(/\/pokemon\/(\d+)\/?$/);

  if (!match) {
    return null;
  }

  return Number(match[1]);
}

function normalizePokemonName(name: string): string {
  return name.replace(/-/g, " ");
}

export function displayPokemonName(name: string): string {
  const normalized = normalizePokemonName(name);
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

interface StoredPokemonIndex {
  createdAt: number;
  entries: PokemonListEntry[];
}

function getStoredIndex(): PokemonListEntry[] | null {
  if (!isBrowser()) {
    return null;
  }

  const raw = window.localStorage.getItem(POKEMON_INDEX_CACHE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StoredPokemonIndex;

    if (
      typeof parsed.createdAt !== "number" ||
      !Array.isArray(parsed.entries) ||
      Date.now() - parsed.createdAt > POKEMON_INDEX_CACHE_TTL_MS
    ) {
      return null;
    }

    return parsed.entries.filter((entry) => {
      return (
        entry &&
        typeof entry === "object" &&
        typeof entry.id === "number" &&
        typeof entry.name === "string"
      );
    });
  } catch {
    return null;
  }
}

function saveIndex(entries: PokemonListEntry[]): void {
  if (!isBrowser()) {
    return;
  }

  const payload: StoredPokemonIndex = {
    createdAt: Date.now(),
    entries,
  };

  window.localStorage.setItem(POKEMON_INDEX_CACHE_KEY, JSON.stringify(payload));
}

export async function getPokemonIndex(): Promise<PokemonListEntry[]> {
  if (pokemonIndexCache) {
    return pokemonIndexCache;
  }

  const stored = getStoredIndex();

  if (stored && stored.length > 0) {
    pokemonIndexCache = stored;
    return stored;
  }

  const response = await fetch("https://pokeapi.co/api/v2/pokemon?limit=1500");

  if (!response.ok) {
    throw new Error("Failed to fetch Pokemon list");
  }

  const payload = (await response.json()) as {
    results: Array<{ name: string; url: string }>;
  };

  const entries = payload.results
    .map((item) => {
      const id = parsePokemonId(item.url);

      if (!id) {
        return null;
      }

      return {
        id,
        name: item.name,
      } satisfies PokemonListEntry;
    })
    .filter((entry): entry is PokemonListEntry => entry !== null)
    .sort((a, b) => a.id - b.id);

  pokemonIndexCache = entries;
  saveIndex(entries);

  return entries;
}

export async function searchPokemon(query: string, limit = 8): Promise<PokemonListEntry[]> {
  const entries = await getPokemonIndex();
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return entries.slice(0, limit);
  }

  const startsWith = entries.filter((entry) => entry.name.startsWith(normalizedQuery));
  const includes = entries.filter(
    (entry) => !entry.name.startsWith(normalizedQuery) && entry.name.includes(normalizedQuery),
  );

  return [...startsWith, ...includes].slice(0, limit);
}

export async function getPokemonDetailsById(id: number): Promise<PokemonDetails> {
  const cached = pokemonDetailsCache.get(id);

  if (cached) {
    return cached;
  }

  const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);

  if (!response.ok) {
    throw new Error("Failed to fetch Pokemon details");
  }

  const payload = (await response.json()) as {
    id: number;
    name: string;
    sprites?: {
      front_default?: string | null;
    };
  };

  const details: PokemonDetails = {
    id: payload.id,
    name: payload.name,
    spriteUrl: payload.sprites?.front_default ?? undefined,
  };

  pokemonDetailsCache.set(id, details);
  return details;
}
