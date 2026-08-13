import { describe, expect, it } from "vitest";
import { computeBenchmarkReturns } from "./benchmark";

describe("computeBenchmarkReturns", () => {
  it("blends 70% MSCI World / 30% Bloomberg Global Agg", () => {
    const r = computeBenchmarkReturns({
      "2025-12": { msci: 100, agg: 100 },
      "2026-05": { msci: 108, agg: 102 },
      "2026-06": { msci: 110, agg: 101 },
    });
    expect(r?.latestMonth).toBe("2026-06");
    // MTD: msci (110-108)/108*100 = 1.8518..., agg (101-102)/102*100 = -0.9803...
    expect(r?.msciMTD).toBeCloseTo(1.85185, 4);
    expect(r?.aggMTD).toBeCloseTo(-0.98039, 4);
    expect(r?.blendMTD).toBeCloseTo(0.7 * 1.85185 + 0.3 * -0.98039, 4);
    // YTD: msci (110-100)/100*100=10, agg (101-100)/100*100=1
    expect(r?.msciYTD).toBeCloseTo(10);
    expect(r?.aggYTD).toBeCloseTo(1);
    expect(r?.blendYTD).toBeCloseTo(0.7 * 10 + 0.3 * 1);
  });

  it("is null when a needed level is missing", () => {
    const r = computeBenchmarkReturns({ "2026-06": { msci: 110, agg: null } });
    expect(r?.msciMTD).toBeNull(); // no prior month
    expect(r?.aggYTD).toBeNull(); // agg missing entirely
  });

  it("returns null overall with no data", () => {
    expect(computeBenchmarkReturns({})).toBeNull();
  });
});
