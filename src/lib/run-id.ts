export function parseRunId(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.includes("/run/")) {
    const match = trimmed.match(/\/run\/([^/?#]+)/i);

    if (match?.[1]) {
      return match[1];
    }

    try {
      const maybeUrl = trimmed.startsWith("http")
        ? new URL(trimmed)
        : new URL(trimmed, "https://linkedlocke.local");
      const segments = maybeUrl.pathname.split("/").filter(Boolean);
      const runSegmentIndex = segments.findIndex((segment) => segment === "run");

      if (runSegmentIndex >= 0 && segments[runSegmentIndex + 1]) {
        return segments[runSegmentIndex + 1];
      }
    } catch {
      return null;
    }
  }

  if (/^[a-zA-Z0-9-_.]+$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}
