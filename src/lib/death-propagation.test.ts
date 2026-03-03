import { describe, expect, it } from "vitest";

import { getDeathPropagationUpdate } from "./death-propagation";

describe("getDeathPropagationUpdate", () => {
  const sourceUpdatedAt = 1000;

  it("returns a dead-state patch when other encounter is alive", () => {
    const result = getDeathPropagationUpdate(
      {
        speciesId: 25,
        speciesName: "pikachu",
        status: "alive",
        updatedAt: 900,
      },
      sourceUpdatedAt,
    );

    expect(result).toEqual({
      speciesId: 25,
      speciesName: "pikachu",
      status: "dead",
      updatedAt: 1001,
    });
  });

  it("does not propagate if encounter is already dead", () => {
    const result = getDeathPropagationUpdate(
      {
        status: "dead",
        updatedAt: 900,
      },
      sourceUpdatedAt,
    );

    expect(result).toBeNull();
  });

  it("does not propagate if other encounter is newer", () => {
    const result = getDeathPropagationUpdate(
      {
        status: "alive",
        updatedAt: 1200,
      },
      sourceUpdatedAt,
    );

    expect(result).toBeNull();
  });

  it("does not propagate for missing or invalid records", () => {
    expect(getDeathPropagationUpdate(null, sourceUpdatedAt)).toBeNull();
    expect(getDeathPropagationUpdate([], sourceUpdatedAt)).toBeNull();
    expect(getDeathPropagationUpdate({ status: "alive" }, sourceUpdatedAt)).toEqual({
      status: "dead",
      updatedAt: 1001,
    });
  });
});
