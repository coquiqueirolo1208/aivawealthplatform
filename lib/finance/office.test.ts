import { describe, expect, it } from "vitest";
import { aggregateTopHoldings, computeOfficeAumSeries, monthsInRange } from "./office";

describe("monthsInRange", () => {
  it("generates inclusive month keys across a year boundary", () => {
    expect(monthsInRange("2025-11", "2026-02")).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });
});

describe("computeOfficeAumSeries", () => {
  const months = monthsInRange("2026-01", "2026-04");

  it("carries the last known value of each account forward and sums across accounts", () => {
    const perAccount: Array<Record<string, number>> = [
      { "2026-01": 100 }, // no update after Jan
      { "2026-01": 50, "2026-03": 70 },
    ];
    const series = computeOfficeAumSeries(perAccount, months, "monthly");
    expect(series).toEqual([
      { x: "2026-01", y: 150 },
      { x: "2026-02", y: 150 }, // both carried forward
      { x: "2026-03", y: 170 },
      { x: "2026-04", y: 170 },
    ]);
  });

  it("is null for a month where no account has any data yet", () => {
    const perAccount = [{ "2026-03": 100 }];
    const series = computeOfficeAumSeries(perAccount, months, "monthly");
    // Jan/Feb have no data before the first snapshot -> trimmed entirely (starts at first real point)
    expect(series).toEqual([
      { x: "2026-03", y: 100 },
      { x: "2026-04", y: 100 },
    ]);
  });

  it("filters to quarter-end months plus the last month under quarterly granularity", () => {
    const wideMonths = monthsInRange("2026-01", "2026-07");
    const perAccount = [{ "2026-01": 100 }];
    const series = computeOfficeAumSeries(perAccount, wideMonths, "quarterly");
    expect(series.map((p) => p.x)).toEqual(["2026-03", "2026-06", "2026-07"]);
  });

  it("returns an empty array with no months", () => {
    expect(computeOfficeAumSeries([{ "2026-01": 100 }], [], "monthly")).toEqual([]);
  });
});

describe("aggregateTopHoldings", () => {
  it("merges holdings with fuzzy-matching names across accounts and clients, and sorts by total desc", () => {
    const perAccount = [
      [{ nombre: "Apple Inc", valor: 100, retornoPct: null }],
      [{ nombre: "APPLE INC (USD)", valor: 50, retornoPct: null }],
      [{ nombre: "Microsoft Corp", valor: 200, retornoPct: null }],
    ];
    const result = aggregateTopHoldings(perAccount, 5);
    expect(result).toEqual([
      { name: "Microsoft Corp", total: 200 },
      { name: "Apple Inc", total: 150 },
    ]);
  });

  it("respects the limit", () => {
    const perAccount = [
      [
        { nombre: "A", valor: 5, retornoPct: null },
        { nombre: "B", valor: 4, retornoPct: null },
        { nombre: "C", valor: 3, retornoPct: null },
      ],
    ];
    expect(aggregateTopHoldings(perAccount, 2)).toEqual([
      { name: "A", total: 5 },
      { name: "B", total: 4 },
    ]);
  });
});
