import { describe, expect, it } from "vitest";
import { computeRiskProfile } from "./risk";

describe("computeRiskProfile", () => {
  it("scores the sum of all 5 answers", () => {
    const r = computeRiskProfile({ horizonte: 2, perdida: 2, experiencia: 2, objetivo: 2, liquidez: 2 });
    expect(r.score).toBe(10);
  });

  it("treats missing answers as 0", () => {
    const r = computeRiskProfile({ horizonte: 4 });
    expect(r.score).toBe(4);
    expect(r.profile).toBe("conservador");
  });

  it("boundary: score 9 is conservador, 10 is balanceado", () => {
    expect(computeRiskProfile({ horizonte: 2, perdida: 2, experiencia: 2, objetivo: 2, liquidez: 1 }).score).toBe(9);
    expect(computeRiskProfile({ horizonte: 2, perdida: 2, experiencia: 2, objetivo: 2, liquidez: 1 }).profile).toBe(
      "conservador",
    );
    expect(computeRiskProfile({ horizonte: 2, perdida: 2, experiencia: 2, objetivo: 2, liquidez: 2 }).profile).toBe(
      "balanceado",
    );
  });

  it("boundary: score 15 is balanceado, 16 is dinamico", () => {
    expect(computeRiskProfile({ horizonte: 3, perdida: 3, experiencia: 3, objetivo: 3, liquidez: 3 }).score).toBe(15);
    expect(computeRiskProfile({ horizonte: 3, perdida: 3, experiencia: 3, objetivo: 3, liquidez: 3 }).profile).toBe(
      "balanceado",
    );
    expect(computeRiskProfile({ horizonte: 4, perdida: 3, experiencia: 3, objetivo: 3, liquidez: 3 }).profile).toBe(
      "dinamico",
    );
  });

  it("max score 20 is dinamico, min score 5 is conservador", () => {
    expect(computeRiskProfile({ horizonte: 4, perdida: 4, experiencia: 4, objetivo: 4, liquidez: 4 }).profile).toBe(
      "dinamico",
    );
    expect(computeRiskProfile({ horizonte: 1, perdida: 1, experiencia: 1, objetivo: 1, liquidez: 1 }).profile).toBe(
      "conservador",
    );
  });
});
