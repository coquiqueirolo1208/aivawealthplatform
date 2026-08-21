import { describe, expect, it } from "vitest";
import { computeBenchmarkReturns } from "./benchmark";

describe("computeBenchmarkReturns", () => {
  it("blends using the default 70/30 when no weight is set for any month", () => {
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
    expect(r?.msciYTD).toBeCloseTo(10);
    expect(r?.aggYTD).toBeCloseTo(1);
    // YTD chains Dec->May then May->June (both blended 70/30) rather than blending the
    // two endpoint returns directly, so it's close to but not exactly 0.7*10 + 0.3*1.
    const decToMay = 0.7 * 8 + 0.3 * 2; // msci +8%, agg +2%
    const mayToJune = 0.7 * 1.85185 + 0.3 * -0.98039;
    const expectedYtd = ((1 + decToMay / 100) * (1 + mayToJune / 100) - 1) * 100;
    expect(r?.blendYTD).toBeCloseTo(expectedYtd, 4);
  });

  it("applies each month's own weight when the mix changes mid-year", () => {
    const levels = {
      "2025-12": { msci: 100, agg: 100 },
      "2026-03": { msci: 110, agg: 100 }, // msci +10%, agg flat, weighted 70/30 up to here
      "2026-06": { msci: 110, agg: 110 }, // msci flat, agg +10%, weighted 40/60 from March on
    };
    const weights = { "2026-03": 70, "2026-04": 40 };
    const r = computeBenchmarkReturns(levels, weights);
    const decToMar = 0.7 * 10 + 0.3 * 0; // weight for March = 70
    const marToJun = 0.4 * 0 + 0.6 * 10; // weight for June = 40 (set from April on)
    const expectedYtd = ((1 + decToMar / 100) * (1 + marToJun / 100) - 1) * 100;
    expect(r?.blendYTD).toBeCloseTo(expectedYtd, 4);
    // Applying today's (40) weight to the whole year would give a different, wrong number.
    expect(r?.blendYTD).not.toBeCloseTo(0.4 * 10 + 0.6 * 10, 4);
  });

  it("MTD uses the weight in effect for the latest month specifically", () => {
    const levels = {
      "2025-12": { msci: 100, agg: 100 },
      "2026-05": { msci: 100, agg: 100 },
      "2026-06": { msci: 110, agg: 100 }, // msci +10% this month, agg flat
    };
    const r = computeBenchmarkReturns(levels, { "2026-06": 20 });
    expect(r?.blendMTD).toBeCloseTo(0.2 * 10 + 0.8 * 0, 4);
  });

  it("tolerates gaps between recorded months (chains through whatever exists)", () => {
    const r = computeBenchmarkReturns({
      "2025-12": { msci: 100, agg: 100 },
      "2026-06": { msci: 110, agg: 101 },
    });
    expect(r?.blendYTD).not.toBeNull();
    expect(r?.blendYTD).toBeCloseTo(0.7 * 10 + 0.3 * 1, 4); // single step == old endpoint-blend result
  });

  it("is null when a needed level is missing", () => {
    const r = computeBenchmarkReturns({ "2026-06": { msci: 110, agg: null } });
    expect(r?.msciMTD).toBeNull(); // no prior month
    expect(r?.aggYTD).toBeNull(); // agg missing entirely
    expect(r?.blendYTD).toBeNull(); // no December baseline to chain from
  });

  it("returns null overall with no data", () => {
    expect(computeBenchmarkReturns({})).toBeNull();
  });
});
