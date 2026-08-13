// Ported from dashboard_patrimonial_13.html: buildPortfolioSummaryForRecs (897-927)
// and the currentFingerprint staleness check used by renderRecommendationsTab.
import { buildAssetTable, latestMonth } from "./core";
import { fmtUSD } from "@/lib/format";
import type { Account, SnapshotsByMonth } from "./types";

export function currentFingerprint(accounts: Array<{ account: Account; snapshots: SnapshotsByMonth }>): string {
  return accounts
    .map(({ account, snapshots }) => `${account.id}:${latestMonth(snapshots) ?? "none"}`)
    .sort()
    .join("|");
}

export function buildPortfolioSummaryForRecs(accs: Array<{ account: Account; snapshots: SnapshotsByMonth }>): string {
  const lines: string[] = [];
  let grandTotal = 0;
  const latestByAccount = accs
    .map(({ account, snapshots }) => {
      const lm = latestMonth(snapshots);
      return { account, month: lm, snap: lm ? snapshots[lm] : null };
    })
    .filter((x) => x.snap);

  latestByAccount.forEach((x) => {
    grandTotal += Number(x.snap!.valorActual) || 0;
  });

  latestByAccount.forEach((x) => {
    const s = x.snap!;
    lines.push(`Cuenta ${x.account.label} (${x.account.custodian}), valor total ${fmtUSD(s.valorActual)}, mes ${x.month}:`);
    (s.holdings || []).forEach((h) => {
      const pct = grandTotal ? ((h.valor / grandTotal) * 100).toFixed(1) : "0";
      const flag = h.retornoPct != null && h.retornoPct <= -15 ? " ⚠ PÉRDIDA SIGNIFICATIVA NO REALIZADA, evaluar si conviene mantener" : "";
      lines.push(
        `- ${h.nombre}: ${fmtUSD(h.valor)} (${pct}% del total consolidado), retorno desde compra: ${h.retornoPct != null ? h.retornoPct.toFixed(1) + "%" : "s/d"}${flag}`,
      );
    });
  });

  const assetRows = buildAssetTable(accs);
  const concentrations = assetRows.filter((r) => grandTotal && (r.total / grandTotal) * 100 >= 8);
  if (concentrations.length) {
    lines.push("Concentraciones relevantes (>=8% del patrimonio total, mismo activo sumado entre cuentas):");
    concentrations.forEach((r) => {
      lines.push(`- ${r.name}: ${fmtUSD(r.total)} (${((r.total / grandTotal) * 100).toFixed(1)}% del total, en ${r.nAccounts} cuenta(s))`);
    });
  }
  lines.push(`Patrimonio consolidado total: ${fmtUSD(grandTotal)}.`);
  return lines.join("\n");
}
