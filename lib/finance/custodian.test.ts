import { describe, expect, it } from "vitest";
import { custodianNamesMatch, matchAccountByCustodian, normalizeAccountNumber } from "./custodian";

// Real cases from two independent AI extractions of the same custodian's statements
// a month apart — different wording, same institution.
describe("custodianNamesMatch", () => {
  it("matches Santander despite a dash vs. parentheses", () => {
    expect(custodianNamesMatch("Banco Santander International - Private Banking", "Banco Santander International (Private Banking)")).toBe(true);
  });

  it("matches Pershing/Pro Capital despite reversed word order", () => {
    expect(
      custodianNamesMatch("Pershing LLC (clearing) / Pro Capital (introducing firm)", "Pro Capital (clearing through Pershing LLC)"),
    ).toBe(true);
  });

  it("matches StoneX despite a different parenthetical suffix", () => {
    expect(custodianNamesMatch("StoneX Financial Inc. (AIVA S.A.)", "StoneX Financial Inc. (IBD: AIVA Investments SA)")).toBe(true);
  });

  it("matches an identical name", () => {
    expect(custodianNamesMatch("UBS Financial Services Inc.", "UBS Financial Services Inc.")).toBe(true);
  });

  it("does not match unrelated custodians", () => {
    expect(custodianNamesMatch("UBS Financial Services Inc.", "Pershing LLC")).toBe(false);
  });

  it("does not match on null/empty input", () => {
    expect(custodianNamesMatch(null, "Pershing LLC")).toBe(false);
    expect(custodianNamesMatch("Pershing LLC", "")).toBe(false);
  });
});

describe("normalizeAccountNumber", () => {
  it("ignores case and punctuation", () => {
    expect(normalizeAccountNumber("JXD-042568")).toBe(normalizeAccountNumber("jxd 042568"));
  });
});

describe("matchAccountByCustodian", () => {
  const accounts = [
    { id: "a1", label: "Pershing / ProCapital", custodian: "Pershing LLC (clearing) / Pro Capital (introducing firm)", accountNumber: "JXD-042568" },
    { id: "a2", label: "Santander Intl.", custodian: "Banco Santander International - Private Banking", accountNumber: null },
  ];

  it("matches by exact account number even when the custodian text looks unrelated", () => {
    const matched = matchAccountByCustodian({ numeroCuenta: "jxd042568", custodioDetectado: "Something else entirely" }, accounts);
    expect(matched).toBe("a1");
  });

  it("falls back to custodian-name token overlap when no account number is available", () => {
    const matched = matchAccountByCustodian(
      { numeroCuenta: null, custodioDetectado: "Banco Santander International (Private Banking)" },
      accounts,
    );
    expect(matched).toBe("a2");
  });

  it("returns null (create new account) when nothing matches", () => {
    const matched = matchAccountByCustodian({ numeroCuenta: null, custodioDetectado: "Charles Schwab" }, accounts);
    expect(matched).toBeNull();
  });
});
