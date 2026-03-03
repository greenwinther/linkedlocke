# LinkedLocke

LinkedLocke is a trust-based Soul Link (Nuzlocke) tracker for two players.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- Firebase Realtime Database
- Zod validation for writes

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local` and fill in your Firebase web config:

```bash
cp .env.example .env.local
```

3. Run the app:

```bash
npm run dev
```

## Testing

```bash
npm run test
```

## Verification

```bash
npm run verify
```

## Routes

- `/` Start screen (Continue / New Game / Load Game)
- `/new` Create run
- `/load` Recover by URL or run ID
- `/run/[runId]` Live tracker + lobby
- `/credits` IP notice and attributions

## Notes

- This MVP uses device-bound soft auth via random local secrets and SHA-256 hashes.
- No Firebase Auth is used yet.
- Pokemon names and sprites are fetched from PokeAPI at runtime.

## RTDB Rules

`database.rules.json` enforces:

- allowed shape for `runs/{runId}` (`meta`, `settings`, `players`, optional `routes`)
- enum checks (`OPEN`/`CLOSED`, `alive`/`dead`)
- value/type checks for IDs, names, hashes, timestamps
- host metadata immutability after creation (only `status: OPEN -> CLOSED`)
- settings and encounter writes only while run is `OPEN`

Deploy rules:

```bash
npx firebase-tools login
npx firebase-tools use <your-firebase-project-id>
npm run deploy:rules -- --project <your-firebase-project-id>
```

Full deployment guide:

- [Deployment Guide](./docs/deployment.md)

Important limitation:

- Because this MVP does not use Firebase Auth yet, rules cannot cryptographically enforce "this device is this player/host". The rules harden data integrity and shape, but they do not provide strong identity authorization until Firebase Auth is added.
- Realtime Database rules do not provide a direct dynamic child-count API for this data shape, so strict "max 2 players" is currently enforced in app logic (and should be moved to auth-backed server enforcement later).
