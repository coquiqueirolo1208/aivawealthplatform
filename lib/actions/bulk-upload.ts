"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fetchUsdExchangeRate, lastDayOfMonth } from "@/lib/fx";

export interface ExtractedStatement {
  numeroCuenta?: string | null;
  mes: string;
  valorActual: number | null;
  valorInicial: number | null;
  valorActivos?: number | null;
  valorPasivos?: number | null;
  flujosNetos: number | null;
  flujosNetosYTD: number | null;
  costosMes?: number | null;
  rentMTD?: number | null;
  rentMTDMetodo?: string | null;
  rentYTD?: number | null;
  rentYTDMetodo?: string | null;
  /** ISO currency code detected in the statement; "USD" or absent means no conversion needed. */
  moneda?: string | null;
  asignacion?: Array<{ tipo: string; valor: number }>;
  holdings?: Array<{ nombre: string; valor: number; retornoPct: number | null }>;
  highlights?: string[];
  movimientos?: string[];
  /** True when /api/ai/extract-statement returned the mock (no ANTHROPIC_API_KEY configured) — never a real reading of the file. */
  _mock?: boolean;
}

/**
 * Expected failures (bad month, no exchange rate) come back as `{ ok: false, error }`
 * rather than a throw: Next.js replaces thrown server-action messages with a generic
 * one in production, so the advisor would never see why the save failed.
 */
export type SaveSnapshotResult = { ok: true; accountId: string } | { ok: false; error: string };

async function toSnapshotFields(ex: ExtractedStatement) {
  if (!/^\d{4}-\d{2}$/.test(ex.mes ?? "")) {
    return { ok: false as const, error: `Mes inválido "${ex.mes}" — tiene que ser AAAA-MM.` };
  }
  const moneda = ex.moneda || "USD";
  const tipoCambio = moneda === "USD" ? null : await fetchUsdExchangeRate(moneda, lastDayOfMonth(ex.mes));
  if (moneda !== "USD" && !tipoCambio) {
    return { ok: false as const, error: `No se pudo obtener el tipo de cambio ${moneda}/USD de ${ex.mes}. Probá de nuevo en unos minutos.` };
  }
  const fields = {
    month: ex.mes,
    valor_actual: ex.valorActual,
    valor_inicial: ex.valorInicial,
    valor_activos: ex.valorActivos ?? null,
    valor_pasivos: ex.valorPasivos ?? null,
    flujos_netos: ex.flujosNetos,
    flujos_netos_ytd: ex.flujosNetosYTD,
    costos_mes: ex.costosMes ?? null,
    rent_mtd: ex.rentMTD ?? null,
    rent_mtd_metodo: ex.rentMTDMetodo ?? null,
    rent_ytd: ex.rentYTD ?? null,
    rent_ytd_metodo: ex.rentYTDMetodo ?? null,
    moneda,
    tipo_cambio: tipoCambio,
    asignacion: ex.asignacion ?? [],
    holdings: ex.holdings ?? [],
    highlights: ex.highlights ?? [],
    movimientos: ex.movimientos ?? [],
  };
  return { ok: true as const, fields };
}

export async function saveExtractedSnapshot(
  clientId: string,
  accountId: string,
  extraction: ExtractedStatement,
): Promise<SaveSnapshotResult> {
  const prepared = await toSnapshotFields(extraction);
  if (!prepared.ok) return { ok: false, error: prepared.error };
  const supabase = await createClient();
  const { error } = await supabase
    .from("snapshots")
    .upsert({ account_id: accountId, ...prepared.fields }, { onConflict: "account_id,month" });
  if (error) throw error;
  // Backfill the account number from this extraction if the account doesn't have
  // one yet — lets future uploads match by number instead of fuzzy custodian text.
  if (extraction.numeroCuenta) {
    const { data: existing } = await supabase.from("accounts").select("account_number").eq("id", accountId).maybeSingle();
    if (existing && !existing.account_number) {
      await supabase.from("accounts").update({ account_number: extraction.numeroCuenta }).eq("id", accountId);
    }
  }
  revalidatePath(`/clientes/${clientId}/consolidado`);
  revalidatePath(`/clientes/${clientId}/cuentas/${accountId}`);
  return { ok: true, accountId };
}

export async function createAccountAndSaveSnapshot(
  clientId: string,
  custodianName: string,
  extraction: ExtractedStatement,
): Promise<SaveSnapshotResult> {
  // Validate before inserting the account, so a failed exchange-rate lookup doesn't
  // leave an empty account behind.
  const prepared = await toSnapshotFields(extraction);
  if (!prepared.ok) return { ok: false, error: prepared.error };

  const supabase = await createClient();
  const { data: account, error: accError } = await supabase
    .from("accounts")
    .insert({ client_id: clientId, label: custodianName, custodian: custodianName, account_number: extraction.numeroCuenta || null })
    .select("id")
    .single();
  if (accError) throw accError;

  const { error } = await supabase
    .from("snapshots")
    .upsert({ account_id: account.id, ...prepared.fields }, { onConflict: "account_id,month" });
  if (error) throw error;
  revalidatePath(`/clientes/${clientId}/consolidado`);
  return { ok: true, accountId: account.id };
}
