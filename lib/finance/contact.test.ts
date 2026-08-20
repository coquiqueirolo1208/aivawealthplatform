import { describe, expect, it } from "vitest";
import { computeStaleContacts } from "./contact";

describe("computeStaleContacts", () => {
  const todayIso = "2026-08-19T00:00:00.000Z";

  it("flags a client whose last note is older than the stale threshold", () => {
    const clients = [
      { clientId: "a", clientName: "Alice", clientCreatedAt: "2020-01-01T00:00:00.000Z", lastNoteAt: "2026-04-01T00:00:00.000Z" },
    ];
    const result = computeStaleContacts(clients, todayIso);
    expect(result).toHaveLength(1);
    expect(result[0].clientId).toBe("a");
    expect(result[0].daysSince).toBeGreaterThanOrEqual(90);
  });

  it("does not flag a client with a recent note", () => {
    const clients = [
      { clientId: "a", clientName: "Alice", clientCreatedAt: "2020-01-01T00:00:00.000Z", lastNoteAt: "2026-08-01T00:00:00.000Z" },
    ];
    expect(computeStaleContacts(clients, todayIso)).toHaveLength(0);
  });

  it("falls back to clientCreatedAt when there is no note yet", () => {
    const clients = [
      { clientId: "a", clientName: "Alice", clientCreatedAt: "2026-08-10T00:00:00.000Z", lastNoteAt: null },
    ];
    // created 9 days ago, well within the grace period -> not flagged
    expect(computeStaleContacts(clients, todayIso)).toHaveLength(0);
  });

  it("flags a client created long ago with no notes ever logged", () => {
    const clients = [
      { clientId: "a", clientName: "Alice", clientCreatedAt: "2020-01-01T00:00:00.000Z", lastNoteAt: null },
    ];
    expect(computeStaleContacts(clients, todayIso)).toHaveLength(1);
  });

  it("respects a custom staleDays threshold and sorts longest-idle first", () => {
    const clients = [
      { clientId: "a", clientName: "A", clientCreatedAt: "2020-01-01T00:00:00.000Z", lastNoteAt: "2026-08-01T00:00:00.000Z" }, // 18 days
      { clientId: "b", clientName: "B", clientCreatedAt: "2020-01-01T00:00:00.000Z", lastNoteAt: "2026-07-01T00:00:00.000Z" }, // 49 days
    ];
    const result = computeStaleContacts(clients, todayIso, 10);
    expect(result.map((r) => r.clientId)).toEqual(["b", "a"]);
  });
});
