"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fetchUsdExchangeRate, lastDayOfMonth } from "@/lib/fx";

export interface ExtractedStatement {
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

async function toSnapshotRow(accountId: string, ex: ExtractedStatement) {
  const moneda = ex.moneda || "USD";
  const tipoCambio = moneda === "USD" ? null : await fetchUsdExchangeRate(moneda, lastDayOfMonth(ex.mes));
  return {
    account_id: accountId,
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
}

export async function saveExtractedSnapshot(clientId: string, accountId: string, extraction: ExtractedStatement) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("snapshots")
    .upsert(await toSnapshotRow(accountId, extraction), { onConflict: "account_id,month" });
  if (error) throw error;
  revalidatePath(`/clientes/${clientId}/consolidado`);
  revalidatePath(`/clientes/${clientId}/cuentas/${accountId}`);
}

export async function createAccountAndSaveSnapshot(
  clientId: string,
  custodianName: string,
  extraction: ExtractedStatement,
) {
  const supabase = await createClient();
  const { data: account, error: accError } = await supabase
    .from("accounts")
    .insert({ client_id: clientId, label: custodianName, custodian: custodianName })
    .select("id")
    .single();
  if (accError) throw accError;

  const { error } = await supabase.from("snapshots").upsert(await toSnapshotRow(account.id, extraction), {
    onConflict: "account_id,month",
  });
  if (error) throw error;
  revalidatePath(`/clientes/${clientId}/consolidado`);
  return account.id;
}
