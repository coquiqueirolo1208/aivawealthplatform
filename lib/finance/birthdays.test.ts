import { describe, expect, it } from "vitest";
import { computeUpcomingBirthdays } from "./birthdays";

describe("computeUpcomingBirthdays", () => {
  it("sorts by soonest next occurrence, wrapping birthdays already passed this year to next year", () => {
    const clients = [
      { id: "a", name: "Alice", fechaNacimiento: "1980-01-10" }, // already passed on 2026-06-15
      { id: "b", name: "Bob", fechaNacimiento: "1990-06-20" }, // 5 days away
      { id: "c", name: "Carol", fechaNacimiento: "1975-07-01" }, // later
    ];
    const result = computeUpcomingBirthdays(clients, "2026-06-15", 5);
    expect(result.map((r) => r.clientName)).toEqual(["Bob", "Carol", "Alice"]);
    expect(result[0].daysUntil).toBe(5);
    expect(result[2].nextOccurrence).toBe("2027-01-10");
  });

  it("treats a birthday today as 0 days away, not 365", () => {
    const clients = [{ id: "a", name: "Alice", fechaNacimiento: "1980-06-15" }];
    const result = computeUpcomingBirthdays(clients, "2026-06-15", 5);
    expect(result[0].daysUntil).toBe(0);
    expect(result[0].nextOccurrence).toBe("2026-06-15");
  });

  it("ignores clients without a birthday on file", () => {
    const clients = [
      { id: "a", name: "Alice", fechaNacimiento: null },
      { id: "b", name: "Bob", fechaNacimiento: "1990-06-20" },
    ];
    const result = computeUpcomingBirthdays(clients, "2026-06-15", 5);
    expect(result).toHaveLength(1);
    expect(result[0].clientName).toBe("Bob");
  });

  it("respects the limit", () => {
    const clients = [
      { id: "a", name: "A", fechaNacimiento: "1990-06-16" },
      { id: "b", name: "B", fechaNacimiento: "1990-06-17" },
      { id: "c", name: "C", fechaNacimiento: "1990-06-18" },
    ];
    const result = computeUpcomingBirthdays(clients, "2026-06-15", 2);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.clientName)).toEqual(["A", "B"]);
  });
});
