"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdvisorClientsWithSnapshots } from "@/lib/queries/portfolio";
import { latestMonth, toUsdValue } from "@/lib/finance";
import { getChatReply } from "@/lib/ai/chat";

/** Builds a compact per-client AUM/custodian summary as context — no full holdings dump, to limit token cost and PII exposure. */
async function buildClientsContext(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const clients = await getAdvisorClientsWithSnapshots(supabase, user.id);
  const lines = clients.map((c) => {
    let aum = 0;
    let any = false;
    const custodians: string[] = [];
    for (const acc of c.accounts) {
      if (acc.custodian) custodians.push(acc.custodian);
      const lm = latestMonth(acc.snapshots);
      const snap = lm ? acc.snapshots[lm] : null;
      const v = snap ? toUsdValue(snap.valorActual, snap.moneda, snap.tipoCambio) : null;
      if (v != null) {
        aum += v;
        any = true;
      }
    }
    return `${c.name}: AUM ${any ? "$" + Math.round(aum).toLocaleString("en-US") : "sin datos"}, custodios: ${custodians.join(", ") || "—"}`;
  });
  return lines.join("\n") || "El asesor todavía no tiene clientes cargados.";
}

export async function askIaAdvisor(question: string): Promise<string> {
  const context = await buildClientsContext();
  return getChatReply(question, context);
}
