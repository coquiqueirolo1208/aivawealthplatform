"use server";

import { requireUser } from "@/lib/supabase/server";
import { fetchAllIn, getAdvisorClientsWithLatestSnapshot } from "@/lib/queries/portfolio";
import { computeMTD, latestMonth, toUsdSnapshot } from "@/lib/finance";
import { getChatReply, type ChatTurn } from "@/lib/ai/chat";
import { aiErrorMessage } from "@/lib/ai/anthropic";
import { todayIso } from "@/lib/dates";

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

/**
 * Per-client context for the IA Advisor: AUM, MTD, statement month, risk profile,
 * allocation, top positions and pending tasks. Names and figures only — no contact
 * data — to keep token cost and PII exposure down.
 */
async function buildClientsContext(): Promise<string> {
  const { supabase, user } = await requireUser();
  const clients = await getAdvisorClientsWithLatestSnapshot(supabase, user.id);
  if (!clients.length) return "El asesor todavía no tiene clientes cargados.";

  const ids = clients.map((c) => c.id);
  const [profiles, tasks] = await Promise.all([
    fetchAllIn(ids, (chunk, from, to) =>
      supabase.from("risk_profiles").select("client_id, profile").in("client_id", chunk).order("client_id").range(from, to),
    ),
    fetchAllIn(ids, (chunk, from, to) =>
      supabase.from("tasks").select("id, client_id, title, due").in("client_id", chunk).eq("done", false).order("id").range(from, to),
    ),
  ]);
  const profileByClient = new Map(profiles.map((p) => [p.client_id, p.profile]));
  const today = todayIso();

  const blocks = clients.map((c) => {
    let aum = 0;
    let mtdWeighted = 0;
    let mtdWeight = 0;
    const months: string[] = [];
    const alloc = new Map<string, number>();
    const positions = new Map<string, number>();
    for (const acc of c.accounts) {
      const lm = latestMonth(acc.snapshots);
      if (!lm) continue;
      const snap = toUsdSnapshot(acc.snapshots[lm]);
      const v = Number(snap.valorActual);
      if (!Number.isFinite(v)) continue;
      aum += v;
      months.push(lm);
      const mtd = computeMTD(snap).value;
      if (mtd != null) {
        mtdWeighted += mtd * v;
        mtdWeight += v;
      }
      for (const a of snap.asignacion ?? []) alloc.set(a.tipo, (alloc.get(a.tipo) ?? 0) + (a.valor || 0));
      for (const h of snap.holdings ?? []) positions.set(h.nombre, (positions.get(h.nombre) ?? 0) + (h.valor || 0));
    }

    const lines = [`## ${c.name}`];
    if (!months.length) {
      lines.push("Sin estados de cuenta cargados.");
    } else {
      const custodians = [...new Set(c.accounts.map((a) => a.custodian).filter(Boolean))].join(", ") || "—";
      lines.push(
        `AUM ${fmt(aum)} en ${c.accounts.length} cuenta(s) (${custodians}); último estado ${months.sort().at(-1)}` +
          (mtdWeight ? `; rentabilidad del mes ${(mtdWeighted / mtdWeight).toFixed(2)}%` : ""),
      );
      const allocTotal = [...alloc.values()].reduce((s, v) => s + v, 0);
      if (allocTotal > 0) {
        lines.push(
          "Asignación: " +
            [...alloc.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([t, v]) => `${t} ${((v / allocTotal) * 100).toFixed(0)}%`)
              .join(", "),
        );
      }
      const top = [...positions.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      if (top.length && aum > 0) {
        lines.push("Principales posiciones: " + top.map(([n, v]) => `${n} ${((v / aum) * 100).toFixed(1)}%`).join("; "));
      }
    }
    lines.push(`Perfil de riesgo: ${profileByClient.get(c.id) ?? "sin cuestionario"}`);
    const pending = tasks.filter((t) => t.client_id === c.id);
    if (pending.length) {
      lines.push(
        "Tareas pendientes: " +
          pending
            .slice(0, 5)
            .map((t) => `${t.title}${t.due ? ` (vence ${t.due}${t.due < today ? ", VENCIDA" : ""})` : ""}`)
            .join("; "),
      );
    }
    return lines.join("\n");
  });
  return `Fecha de hoy: ${today}. Montos en USD.\n\n${blocks.join("\n\n")}`;
}

/** Answers the latest question in `history`, with the earlier turns as conversation memory. */
export async function askIaAdvisor(history: ChatTurn[]): Promise<{ reply: string } | { error: string }> {
  // Outside the try: requireUser's redirect to /login works by throwing, and must not be swallowed.
  const context = await buildClientsContext();
  try {
    return { reply: await getChatReply(history, context) };
  } catch (e) {
    console.error("askIaAdvisor", e);
    return { error: aiErrorMessage(e, "Hubo un error al responder. Probá de nuevo.") };
  }
}
