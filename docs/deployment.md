# Deployment

This project deploys the web app on Vercel and Realtime Database rules via Firebase CLI.

## 1. Pre-deploy checks

Run the full local verification pipeline:

```bash
npm run verify
```

This validates required Firebase env keys, runs lint/tests, and builds Next.js.

## 2. Firebase rules deployment

One-time setup:

```bash
npx firebase-tools login
npx firebase-tools use linkedlocke-dev
```

Enable Firebase Authentication:

1. Firebase Console -> Authentication -> Sign-in method
2. Enable `Anonymous`

Deploy rules:

```bash
npm run deploy:rules -- --project linkedlocke-dev
```

If you prefer local project aliases, copy `.firebaserc.example` to `.firebaserc` and set your default project.

## 3. Vercel deployment

In Vercel project settings, add these environment variables for Production (and Preview if desired):

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_DATABASE_URL`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Recommended build settings:

- Framework Preset: `Next.js`
- Build Command: `npm run build`
- Install Command: `npm install`

## 4. Post-deploy smoke test

After deploying to Vercel, validate:

1. `/new` creates a run successfully.
2. Invite URL opens `/run/{runId}` in another browser/device.
3. Second player can join and appears live.
4. Encounter edits sync live between both clients.
5. Host can toggle propagation and close run.
