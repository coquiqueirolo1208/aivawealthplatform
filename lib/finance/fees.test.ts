import { describe, expect, it } from "vitest";
import { computeQuarterFee, lastClosedQuarter, quarterMonths, quarterOf, shiftQuarter } from "./fees";

describe("quarters", () => {
  it("maps months to quarters and back", () => {
    expect(quarterOf("2026-01")).toBe("2026-Q1");
    expect(quarterOf("2026-09")).toBe("2026-Q3");
    expect(quarterMonths("2026-Q4")).toEqual(["2026-10", "2026-11", "2026-12"]);
  });

  it("shifts across years", () => {
    expect(shiftQuarter("2026-Q1", -1)).toBe("2025-Q4");
    expect(shiftQuarter("2025-Q4", 1)).toBe("2026-Q1");
  });

  it("finds the last fully closed quarter", () => {
    expect(lastClosedQuarter("2026-10-01")).toBe("2026-Q3");
    expect(lastClosedQuarter("2026-01-15")).toBe("2025-Q4");
  });
});

describe("computeQuarterFee", () => {
  const monthly = { "2026-07": 1_000_000, "2026-08": 1_100_000, "2026-09": 1_200_000 };

  it("charges a quarter of the annual % on the average month-end AUM", () => {
    const r = computeQuarterFee(monthly, "2026-Q3", 1, null);
    expect(r.baseAum).toBe(1_100_000);
    expect(r.monthsUsed).toBe(3);
    expect(r.fee).toBeCloseTo(2750); // 1.1M * 1% / 4
    expect(r.minimumApplied).toBe(false);
  });

  it("averages only the months that are loaded", () => {
    const r = computeQuarterFee({ "2026-07": 1_000_000, "2026-09": 1_200_000 }, "2026-Q3", 1, null);
    expect(r.baseAum).toBe(1_100_000);
    expect(r.monthsUsed).toBe(2);
  });

  it("applies the annual minimum pro rata per quarter", () => {
    const r = computeQuarterFee(monthly, "2026-Q3", 0.5, 20_000);
    expect(r.fee).toBe(5000);
    expect(r.minimumApplied).toBe(true);
  });

  it("has no fee without a % or without statements", () => {
    expect(computeQuarterFee(monthly, "2026-Q3", null, null).fee).toBeNull();
    expect(computeQuarterFee({}, "2026-Q3", 1, null)).toEqual({ baseAum: null, monthsUsed: 0, fee: null, minimumApplied: false });
  });
});
