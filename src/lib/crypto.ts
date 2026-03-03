const encoder = new TextEncoder();

function getCryptoApi(): Crypto {
  if (typeof crypto === "undefined") {
    throw new Error("Web Crypto API is not available.");
  }

  return crypto;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await getCryptoApi().subtle.digest("SHA-256", encoder.encode(input));
  return bytesToHex(new Uint8Array(digest));
}

export function generateRandomSecret(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  getCryptoApi().getRandomValues(bytes);
  return bytesToHex(bytes);
}

export function generateId(): string {
  const cryptoApi = getCryptoApi();

  if (typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  return generateRandomSecret(16);
}
