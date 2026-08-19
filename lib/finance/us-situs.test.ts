import { describe, expect, it } from "vitest";
import { computeTodPendienteAccounts, computeUsSitusExposure, guessUsSitus, isUsSitusHolding } from "./us-situs";

describe("guessUsSitus", () => {
  it("flags well-known US ETF tickers and names", () => {
    expect(guessUsSitus("SPY")).toBe(true);
    expect(guessUsSitus("Vanguard S&P 500 ETF")).toBe(true);
    expect(guessUsSitus("iShares Core S&P 500 UCITS ETF")).toBe(true);
  });

  it("flags well-known US individual stocks", () => {
    expect(guessUsSitus("Apple Inc")).toBe(true);
    expect(guessUsSitus("Microsoft Corp")).toBe(true);
  });

  it("does not flag unrelated funds", () => {
    expect(guessUsSitus("Investec Global Fixed Income")).toBe(false);
    expect(guessUsSitus("DNCA Alpha Bonds")).toBe(false);
  });
});

describe("isUsSitusHolding", () => {
  it("prefers an explicit manual flag over the heuristic", () => {
    expect(isUsSitusHolding({ nombre: "Apple Inc", usSitus: false })).toBe(false);
    expect(isUsSitusHolding({ nombre: "Some Random Fund", usSitus: true })).toBe(true);
  });

  it("falls back to the heuristic when unset", () => {
    expect(isUsSitusHolding({ nombre: "Apple Inc", usSitus: null })).toBe(true);
    expect(isUsSitusHolding({ nombre: "Investec Global Fixed Income", usSitus: undefined })).toBe(false);
  });
});

describe("computeUsSitusExposure", () => {
  it("sums US-situs holdings across personal accounts and flags over threshold", () => {
    const accounts = [
      { titularidad: "personal", holdings: [{ nombre: "Apple Inc", valor: 40000, retornoPct: null }] },
      { titularidad: null, holdings: [{ nombre: "SPY", valor: 25000, retornoPct: null }] },
    ];
    const result = computeUsSitusExposure(accounts);
    expect(result.total).toBe(65000);
    expect(result.overThreshold).toBe(true);
  });

  it("excludes accounts held by a legal entity", () => {
    const accounts = [
      { titularidad: "juridica", holdings: [{ nombre: "Apple Inc", valor: 100000, retornoPct: null }] },
      { titularidad: "personal", holdings: [{ nombre: "Apple Inc", valor: 10000, retornoPct: null }] },
    ];
    const result = computeUsSitusExposure(accounts);
    expect(result.total).toBe(10000);
    expect(result.overThreshold).toBe(false);
  });

  it("is not over threshold exactly at the boundary", () => {
    const accounts = [{ titularidad: "personal", holdings: [{ nombre: "Apple Inc", valor: 60000, retornoPct: null }] }];
    expect(computeUsSitusExposure(accounts).overThreshold).toBe(false);
    accounts[0].holdings[0].valor = 60000.01;
    expect(computeUsSitusExposure(accounts).overThreshold).toBe(true);
  });

  it("respects a manual override even when it disagrees with the heuristic", () => {
    const accounts = [{ titularidad: "personal", holdings: [{ nombre: "Apple Inc", valor: 100000, retornoPct: null, usSitus: false }] }];
    expect(computeUsSitusExposure(accounts).total).toBe(0);
  });
});

describe("computeTodPendienteAccounts", () => {
  it("returns only non-juridica accounts without TOD completed", () => {
    const accounts = [
      { accountId: "1", accountLabel: "A", titularidad: "personal", todCompletado: false },
      { accountId: "2", accountLabel: "B", titularidad: "personal", todCompletado: true },
      { accountId: "3", accountLabel: "C", titularidad: "juridica", todCompletado: false },
      { accountId: "4", accountLabel: "D", titularidad: null, todCompletado: false },
    ];
    const result = computeTodPendienteAccounts(accounts);
    expect(result.map((a) => a.accountId)).toEqual(["1", "4"]);
  });
});
