import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import dotenv from "dotenv";

const root = process.cwd();

for (const fileName of [".env.local", ".env"]) {
  const fullPath = path.join(root, fileName);

  if (fs.existsSync(fullPath)) {
    dotenv.config({ path: fullPath, override: false });
  }
}

const requiredEnvKeys = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_DATABASE_URL",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
];

const missing = requiredEnvKeys.filter((key) => {
  const value = process.env[key];
  return typeof value !== "string" || value.trim().length === 0;
});

if (missing.length > 0) {
  console.error("[env] Missing required Firebase environment variables:");
  for (const key of missing) {
    console.error(`- ${key}`);
  }
  process.exit(1);
}

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const databaseUrl = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

if (!databaseUrl.includes(projectId)) {
  console.warn(
    "[env] Warning: NEXT_PUBLIC_FIREBASE_DATABASE_URL does not contain NEXT_PUBLIC_FIREBASE_PROJECT_ID.",
  );
}

console.log(`[env] Firebase env validation passed (${requiredEnvKeys.length} keys).`);
