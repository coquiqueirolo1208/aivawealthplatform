import { describe, expect, it } from "vitest";
import { buildFundIndexSeries, computeFundRisk } from "./funds";
import type { FundRow } from "./types";

function fund(overrides: Partial<FundRow> = {}): FundRow {
  return { isin: "TEST", name: "Test Fund", ...overrides };
}

describe("buildFundIndexSeries", () => {
  it("compounds calendar-year returns from a base of 100", () => {
    const s = buildFundIndexSeries(fund({ y2021: 10, y2022: -10, y2023: 5, y2024: 0, y2025: 2 }));
    // 100 -> 110 -> 99 -> 103.95 -> 103.95 -> 106.029
    expect(s.points[0]).toBe(100);
    expect(s.points[1]).toBeCloseTo(110);
    expect(s.points[2]).toBeCloseTo(99);
    expect(s.points[3]).toBeCloseTo(103.95);
    expect(s.points[4]).toBeCloseTo(103.95);
    expect(s.points[5]).toBeCloseTo(106.029);
    expect(s.labels).toEqual(["2020", "2021", "2022", "2023", "2024", "2025"]);
  });

  it("skips null years instead of zero-filling them", () => {
    const s = buildFundIndexSeries(fund({ y2021: 10, y2022: null, y2023: 10 }));
    expect(s.labels).toEqual(["2020", "2021", "2023"]);
    expect(s.points[0]).toBeCloseTo(100);
    expect(s.points[1]).toBeCloseTo(110);
    expect(s.points[2]).toBeCloseTo(121);
  });

  it("appends a YTD leg when present", () => {
    const s = buildFundIndexSeries(fund({ y2021: 10, ytd: 5 }));
    expect(s.labels.at(-1)).toBe("YTD 5.0%");
    expect(s.points.at(-1)).toBeCloseTo(115.5);
  });
});

describe("computeFundRisk", () => {
  it("computes the sample standard deviation (n-1) of the 5 yearly returns", () => {
    const vals = [10, -10, 5, 0, 2];
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / (vals.length - 1);
    const expected = Math.sqrt(variance);
    expect(computeFundRisk(fund({ y2021: 10, y2022: -10, y2023: 5, y2024: 0, y2025: 2 }))).toBeCloseTo(expected);
  });

  it("returns null with fewer than 2 valid years", () => {
    expect(computeFundRisk(fund({ y2021: 10 }))).toBeNull();
    expect(computeFundRisk(fund())).toBeNull();
  });
});
