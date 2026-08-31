// Ported from dashboard_patrimonial_13.html scanClientForRadar/buildRadarData (line ~440-536).
// Pure function over already-fetched data — the DB fetch (per-advisor, across every
// client) lives in lib/queries/radar.ts. The original scans a KV store client-by-client
// (N+1); here the caller does that fan-out with a handful of flat queries instead.
import { aggregateAllocation, monthDiff, normalizeName } from "./core";
import { computePMTargetWeights } from "./investec";
import { computeTodPendienteAccounts, computeUsSitusExposure } from "./us-situs";
import { computeStaleContacts } from "./contact";
import type { AccountWithSnapshots } from "@/lib/queries/portfolio";
import type { ModelPortfolio } from "./types";
import { docStatusInfo, type DocumentLike } from "@/lib/documents";

export interface RadarClientInput {
  id: string;
  name: string;
  createdAt: string;
  lastNoteAt: string | null;
  accounts: AccountWithSnapshots[];
  documents: Array<DocumentLike & { tipo: string }>;
  riskProfile: { profile: string } | null;
  tasks: Array<{ title: string; due: string | null; done: boolean }>;
}

export interface RadarData {
  concentraciones: Array<{ clientId: string; clientName: string; activo: string; pct: number; valor: number }>;
  atrasos: Array<{
    clientId: string;
    clientName: string;
    accountId: string;
    account: string;
    situacion: "sin_datos" | "atrasado";
    ultimoMes?: string;
    mesesAtraso?: number;
  }>;
  riesgo: Array<{ clientId: string; clientName: string; perfil: string; rvActual: number; rvTarget: number; dev: number }>;
  tareas: Array<{ clientId: string; clientName: string; title: string; due: string }>;
  documentos: Array<{ clientId: string; clientName: string; tipo: string; estado: string; vencimiento: string | null }>;
  usSitusRiesgo: Array<{ clientId: string; clientName: string; total: number }>;
  todPendiente: Array<{ clientId: string; clientName: string; accountId: string; account: string }>;
  contactoPendiente: Array<{ clientId: string; clientName: string; lastContactAt: string; daysSince: number }>;
  fondeoPendiente: Array<{ clientId: string; clientName: string; accountId: string; account: string; monto: number }>;
}

export function buildRadarData(
  clients: RadarClientInput[],
  modelPortfolios: Map<string, ModelPortfolio | null>,
  todayIso: string,
): RadarData {
  const all: RadarData = {
    concentraciones: [],
    atrasos: [],
    riesgo: [],
    tareas: [],
    documentos: [],
    usSitusRiesgo: [],
    todPendiente: [],
    contactoPendiente: [],
    fondeoPendiente: [],
  };
  const todayMonth = todayIso.slice(0, 7);

  for (const client of clients) {
    client.documents.forEach((d) => {
      const st = docStatusInfo(d);
      if (st.label !== "Vigente") {
        all.documentos.push({ clientId: client.id, clientName: client.name, tipo: d.tipo, estado: st.label, vencimiento: d.vencimiento });
      }
    });

    const latestByAccount = client.accounts.map((a) => {
      const months = Object.keys(a.snapshots).sort();
      const lm = months.length ? months[months.length - 1] : null;
      return { account: a, month: lm, snap: lm ? a.snapshots[lm] : null };
    });
    const withData = latestByAccount.filter((x) => x.snap);
    const total = withData.reduce((s, x) => s + (Number(x.snap!.valorActual) || 0), 0);

    if (total > 0) {
      const rows: Record<string, { name: string; total: number }> = {};
      withData.forEach((x) => {
        (x.snap!.holdings || []).forEach((h) => {
          const key = normalizeName(h.nombre);
          if (!key) return;
          if (!rows[key]) rows[key] = { name: h.nombre, total: 0 };
          rows[key].total += Number(h.valor) || 0;
        });
      });
      Object.values(rows).forEach((r) => {
        const pct = (r.total / total) * 100;
        if (pct >= 12) {
          all.concentraciones.push({ clientId: client.id, clientName: client.name, activo: r.name, pct, valor: r.total });
        }
      });
    }

    client.accounts.forEach((a) => {
      const months = Object.keys(a.snapshots).sort();
      const lm = months.length ? months[months.length - 1] : null;
      if (!lm) {
        all.atrasos.push({ clientId: client.id, clientName: client.name, accountId: a.id, account: a.label, situacion: "sin_datos" });
      } else {
        const lag = monthDiff(lm, todayMonth);
        if (lag >= 2) {
          all.atrasos.push({ clientId: client.id, clientName: client.name, accountId: a.id, account: a.label, situacion: "atrasado", ultimoMes: lm, mesesAtraso: lag });
        }
      }
    });

    if (client.riskProfile?.profile && total > 0) {
      const target = computePMTargetWeights(modelPortfolios.get(client.riskProfile.profile) ?? null);
      if (target) {
        const totals = aggregateAllocation(withData.map((x) => x.snap!));
        const sumTotals = Object.values(totals).reduce((s, v) => s + v, 0);
        if (sumTotals > 0) {
          const rvActual = ((totals["Renta Variable"] || 0) / sumTotals) * 100;
          const rvTarget = target["Renta Variable"] || 0;
          const dev = rvActual - rvTarget;
          if (Math.abs(dev) > 15) {
            const pfLabel = modelPortfolios.get(client.riskProfile.profile)?.label ?? client.riskProfile.profile;
            all.riesgo.push({ clientId: client.id, clientName: client.name, perfil: pfLabel, rvActual, rvTarget, dev });
          }
        }
      }
    }

    client.tasks
      .filter((t) => !t.done && t.due && t.due < todayIso)
      .forEach((task) => {
        all.tareas.push({ clientId: client.id, clientName: client.name, title: task.title, due: task.due! });
      });

    const { total: usSitusTotal, overThreshold } = computeUsSitusExposure(
      withData.map((x) => ({ titularidad: x.account.titularidad, holdings: x.snap!.holdings })),
    );
    if (overThreshold) {
      all.usSitusRiesgo.push({ clientId: client.id, clientName: client.name, total: usSitusTotal });
    }

    computeTodPendienteAccounts(
      client.accounts.map((a) => ({ accountId: a.id, accountLabel: a.label, titularidad: a.titularidad, todCompletado: a.todCompletado })),
    ).forEach((a) => {
      all.todPendiente.push({ clientId: client.id, clientName: client.name, accountId: a.accountId, account: a.accountLabel });
    });

    client.accounts.forEach((a) => {
      if (a.montoPendienteTransferir && a.montoPendienteTransferir > 0) {
        all.fondeoPendiente.push({ clientId: client.id, clientName: client.name, accountId: a.id, account: a.label, monto: a.montoPendienteTransferir });
      }
    });
  }

  all.contactoPendiente = computeStaleContacts(
    clients.map((c) => ({ clientId: c.id, clientName: c.name, clientCreatedAt: c.createdAt, lastNoteAt: c.lastNoteAt })),
    todayIso,
  );

  all.concentraciones.sort((a, b) => b.pct - a.pct);
  all.atrasos.sort((a, b) => (b.mesesAtraso ?? 99) - (a.mesesAtraso ?? 99));
  all.riesgo.sort((a, b) => Math.abs(b.dev) - Math.abs(a.dev));
  all.tareas.sort((a, b) => a.due.localeCompare(b.due));
  all.documentos.sort((a, b) => (a.vencimiento ?? "0").localeCompare(b.vencimiento ?? "0"));
  all.usSitusRiesgo.sort((a, b) => b.total - a.total);
  all.fondeoPendiente.sort((a, b) => b.monto - a.monto);
  return all;
}

/** Total count across every Radar category — used for the nav badge and similar at-a-glance summaries. */
export function countRadarAlerts(data: RadarData): number {
  return (
    data.tareas.length +
    data.documentos.length +
    data.atrasos.length +
    data.riesgo.length +
    data.usSitusRiesgo.length +
    data.todPendiente.length +
    data.contactoPendiente.length +
    data.fondeoPendiente.length
  );
}
