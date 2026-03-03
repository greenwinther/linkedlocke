import { describe, expect, it } from "vitest";

import { parseRunId } from "./run-id";

describe("parseRunId", () => {
  it("parses raw run IDs", () => {
    expect(parseRunId("abc123")).toBe("abc123");
    expect(parseRunId(" run-id_1 ")).toBe("run-id_1");
  });

  it("parses full run URLs", () => {
    expect(parseRunId("https://example.com/run/abc123")).toBe("abc123");
    expect(parseRunId("https://example.com/run/xyz?foo=bar")).toBe("xyz");
  });

  it("rejects invalid strings", () => {
    expect(parseRunId("")).toBeNull();
    expect(parseRunId("/run/")).toBeNull();
    expect(parseRunId("bad id with spaces")).toBeNull();
  });
});
