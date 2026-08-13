// Transforms the raw JS-literal extractions in supabase/seed-data/*.json into
// snake_case rows matching the Supabase schema (supabase/migrations/0001_schema.sql),
// ready for insertion. Run after scripts/extract-data.mjs.
//
// Usage: node scripts/transform-seed-data.mjs

import fs from "node:fs";
import path from "node:path";

const dir = path.resolve(import.meta.dirname, "../supabase/seed-data");
const cleanDir = path.join(dir, "clean");
fs.mkdirSync(cleanDir, { recursive: true });

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(dir, `${name}.json`), "utf8"));
}
function save(name, data) {
  fs.writeFileSync(path.join(cleanDir, `${name}.json`), JSON.stringify(data));
  const size = Array.isArray(data) ? `${data.length} rows` : `${Object.keys(data).length} keys`;
  console.log(`clean/${name}.json (${size})`);
}

/** number -> number, "#N/A"/null/undefined -> null, any other non-numeric string -> null (and counted as junk). */
function cleanNum(v, junkCounter) {
  if (typeof v === "number") return v;
  if (v === null || v === undefined || v === "#N/A") return null;
  const n = parseFloat(v);
  if (!isNaN(n) && String(n) === String(v).trim()) return n;
  if (junkCounter) junkCounter.count++;
  return null;
}

// ---------------------------------------------------------------------------
// funds (FONDOS_DB) — drop rows that are leaked spreadsheet header artifacts
// (>=3 numeric-looking columns holding non-numeric junk like "Morningstar
// Rating" or "1 week"), null out isolated junk in otherwise-valid rows
// (e.g. one row has an Excel formula string leaked into `rt`).
// ---------------------------------------------------------------------------
{
  const raw = load("FONDOS_DB");
  const numCols = [
    "rt", "d1", "w1", "m1", "qtd", "ytd", "y1", "y3", "y5", "si",
    "y2021", "y2022", "y2023", "y2024", "y2025", "sh3", "sh5", "aum",
  ];
  let dropped = 0;
  const rows = [];
  for (const f of raw) {
    const junk = { count: 0 };
    const cleaned = { isin: f.isin, name: f.name, cat: f.cat ?? null, sub: f.sub ?? null };
    for (const c of numCols) cleaned[c] = cleanNum(f[c], junk);
    if (junk.count >= 3) {
      dropped++;
      continue;
    }
    rows.push(cleaned);
  }
  console.log(`funds: dropped ${dropped} junk row(s) out of ${raw.length}`);
  save("funds", rows);
}

// ---------------------------------------------------------------------------
// ideas_stocks (ACCIONES_IDEAS)
// ---------------------------------------------------------------------------
{
  const raw = load("ACCIONES_IDEAS");
  save(
    "ideas_stocks",
    raw.map((r) => ({
      isin: r.isin,
      name: r.name,
      sector: r.sector ?? null,
      industry: r.industry ?? null,
      ticker: r.ticker ?? null,
      currency: r.currency ?? null,
      price: cleanNum(r.price),
      target_median: cleanNum(r.targetMedian),
      exp_growth: cleanNum(r.expGrowth),
      dvd_yield: cleanNum(r.dvdYield),
      ytd: cleanNum(r.ytd),
      ret1y: cleanNum(r.ret1y),
      ret3y: cleanNum(r.ret3y),
      ret5y: cleanNum(r.ret5y),
      vol6m: cleanNum(r.vol6m),
      country: r.country ?? null,
      mkt_cap_b: cleanNum(r.mktCapB),
    })),
  );
}

// ---------------------------------------------------------------------------
// ideas_funds (FONDOS_IDEAS_DB)
// ---------------------------------------------------------------------------
{
  const raw = load("FONDOS_IDEAS_DB");
  // Drop leaked spreadsheet header rows (literal repeated "Nombre"/"Clase"/... labels).
  const filtered = raw.filter((r) => String(r.name ?? "").trim().toLowerCase() !== "nombre");
  console.log(`ideas_funds: dropped ${raw.length - filtered.length} junk row(s) out of ${raw.length}`);
  save(
    "ideas_funds",
    filtered.map((r) => ({
      isin_acc: r.isinAcc,
      name: r.name,
      class: r.class ?? null,
      sector: r.sector ?? null,
      subsector: r.subsector ?? null,
      currency: r.currency ?? null,
      ytd: cleanNum(r.ytd),
      ret1y: cleanNum(r.ret1y),
      ret3y: cleanNum(r.ret3y),
      ret5y: cleanNum(r.ret5y),
      min_invest: cleanNum(r.minInvest),
      vol3y: cleanNum(r.vol3y),
      sharpe3y: cleanNum(r.sharpe3y),
      expense_ratio: cleanNum(r.expenseRatio),
      dvd_yield: cleanNum(r.dvdYield),
      dvd_freq: r.dvdFreq ?? null,
      isin_dist: r.isinDist ?? null,
      inception_date: r.inceptionDate ?? null,
      ticker: r.ticker ?? null,
    })),
  );
}

// ---------------------------------------------------------------------------
// ideas_etfs (ETFS_IDEAS)
// ---------------------------------------------------------------------------
{
  const raw = load("ETFS_IDEAS");
  save(
    "ideas_etfs",
    raw.map((r) => ({
      isin_acc: r.isinAcc,
      name: r.name,
      sector: r.sector ?? null,
      subsector: r.subsector ?? null,
      ticker_acc: r.tickerAcc ?? null,
      ticker_dist: r.tickerDist ?? null,
      manager: r.manager ?? null,
      strategy: r.strategy ?? null,
      inception: r.inception ?? null,
      total_assets_m: cleanNum(r.totalAssetsM),
      price: cleanNum(r.price),
      ytd: cleanNum(r.ytd),
      ret1y: cleanNum(r.ret1y),
      ret3y: cleanNum(r.ret3y),
      isin_dist: r.isinDist ?? null,
      dvd_yield: cleanNum(r.dvdYield),
      cost: cleanNum(r.cost),
    })),
  );
}

// ---------------------------------------------------------------------------
// ideas_bonds (BONOS_IDEAS)
// ---------------------------------------------------------------------------
{
  const raw = load("BONOS_IDEAS");
  save(
    "ideas_bonds",
    raw.map((r) => ({
      isin: r.isin,
      issuer: r.issuer,
      sector: r.sector ?? null,
      subsector: r.subsector ?? null,
      maturity: r.maturity ?? null,
      coupon: cleanNum(r.coupon),
      coupon_type: r.couponType ?? null,
      price: cleanNum(r.price),
      ytm: cleanNum(r.ytm),
      min_piece: cleanNum(r.minPiece),
      increment: cleanNum(r.increment),
      country: r.country ?? null,
      seniority: r.seniority ?? null,
      rule144a: r.rule144a ?? null,
      rating_sp: r.ratingSP ?? null,
      rating_moody: r.ratingMoody ?? null,
      duration: cleanNum(r.duration),
      callable: r.callable ?? null,
      next_call: r.nextCall ?? null,
      ytc: cleanNum(r.ytc),
      outstanding: r.outstanding ?? null,
    })),
  );
}

// ---------------------------------------------------------------------------
// model_portfolios + model_portfolio_holdings (PM_DATA)
// ---------------------------------------------------------------------------
{
  const raw = load("PM_DATA");
  const portfolios = [];
  const holdings = [];
  for (const [key, pf] of Object.entries(raw)) {
    portfolios.push({ key, label: pf.label, cash: pf.cash });
    for (const h of pf.holdings) {
      holdings.push({
        portfolio_key: key,
        isin: h.isin ?? null,
        name: h.name,
        sector: h.sector ?? null,
        section: h.section,
        weight: h.weight,
      });
    }
  }
  save("model_portfolios", portfolios);
  save("model_portfolio_holdings", holdings);
}

// ---------------------------------------------------------------------------
// investec_solutions (INVESTEC_SOLUTIONS)
// ---------------------------------------------------------------------------
{
  const raw = load("INVESTEC_SOLUTIONS");
  save(
    "investec_solutions",
    raw.map((s) => ({
      id: s.id,
      badge: s.badge ?? null,
      name: s.name,
      isin: s.isin ?? null,
      risk: s.risk ?? null,
      equity_range: s.equityRange ?? null,
      alloc_key: s.allocKey ?? null,
      yd_key: s.ydKey ?? null,
      tipo_rf_key: s.tipoRFKey ?? null,
      full_name: s.fullName ?? null,
      evo_key: s.evoKey ?? null,
    })),
  );
}

// ---------------------------------------------------------------------------
// investec_classes (INVESTEC_CLASES) — tuples: [className, isinAcc, isinDist, feeBps, terPct, allInPct]
// ---------------------------------------------------------------------------
{
  const raw = load("INVESTEC_CLASES");
  function parsePct(s) {
    if (s == null) return null;
    const n = parseFloat(String(s).replace(/[^0-9.\-]/g, ""));
    return isNaN(n) ? null : n;
  }
  const rows = [];
  for (const [solutionId, classes] of Object.entries(raw)) {
    for (const tuple of classes) {
      const [className, isinAcc, isinDist, feeBps, terPct, allInPct] = tuple;
      rows.push({
        solution_id: solutionId,
        class_name: className,
        isin_acc: isinAcc ?? null,
        isin_dist: isinDist ?? null,
        management_fee_bps: parsePct(feeBps),
        ter_pct: parsePct(terPct),
        all_in_pct: parsePct(allInPct),
      });
    }
  }
  save("investec_classes", rows);
}

// ---------------------------------------------------------------------------
// reference_data: one row holding the deeply-nested Investec catalog data
// (fundAllocation, aaTiempo, fundInfo, top10, yd, regional, tipoRentaFija) —
// see the schema migration's comment for why this stays JSONB instead of ~10
// more normalized tables.
// ---------------------------------------------------------------------------
{
  const raw = load("INVESTEC_DATA");
  save("reference_data", [{ key: "investec_data", data: raw }]);
}

console.log("\nNote: DEMO_DATA.json was extracted but NOT transformed here — it needs a real");
console.log("advisor_id (a signed-up auth.users row) to attach demo clients/accounts/snapshots");
console.log("to, so it's handled by a separate seed step once at least one advisor account exists.");
