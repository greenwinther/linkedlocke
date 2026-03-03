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

RTDB rules tests (Database Emulator):

```bash
npm run test:rules
```

Requirements for `test:rules`:

- Java (required by Firebase emulators)
- Firebase CLI (the script uses `npx firebase-tools`)

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
- Firebase Anonymous Auth is used for ownership binding in RTDB rules.
- Pokemon names and sprites are fetched from PokeAPI at runtime.

## RTDB Rules

`database.rules.json` enforces:

- allowed shape for `runs/{runId}` (`meta`, `settings`, `players`, optional `routes`)
- enum checks (`OPEN`/`CLOSED`, `alive`/`dead`)
- value/type checks for IDs, names, hashes, timestamps
- host metadata immutability after creation (only `status: OPEN -> CLOSED`)
- host-only writes for run settings and close action
- player ownership binding via `players/{playerId}.authUid`
- encounter writes limited to encounter owner auth uid

Deploy rules:

```bash
npx firebase-tools login
npx firebase-tools use <your-firebase-project-id>
npm run deploy:rules -- --project <your-firebase-project-id>
```

Full deployment guide:

- [Deployment Guide](./docs/deployment.md)

Important limitation:

- Realtime Database rules do not provide a direct dynamic child-count API for this data shape, so strict "max 2 players" is currently enforced in app logic.
