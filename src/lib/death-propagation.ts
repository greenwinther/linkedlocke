export function getDeathPropagationUpdate(
  currentEncounter: unknown,
  sourceUpdatedAt: number,
): Record<string, unknown> | null {
  if (!currentEncounter || typeof currentEncounter !== "object" || Array.isArray(currentEncounter)) {
    return null;
  }

  const encounterRecord = currentEncounter as Record<string, unknown>;

  if (encounterRecord.status !== "alive") {
    return null;
  }

  if (
    typeof encounterRecord.updatedAt === "number" &&
    Number.isFinite(encounterRecord.updatedAt) &&
    encounterRecord.updatedAt > sourceUpdatedAt
  ) {
    return null;
  }

  return {
    ...encounterRecord,
    status: "dead",
    updatedAt: sourceUpdatedAt + 1,
  };
}
