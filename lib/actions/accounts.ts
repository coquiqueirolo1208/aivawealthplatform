"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fetchUsdExchangeRate, lastDayOfMonth } from "@/lib/fx";

async function requireSupabase() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return supabase;
}

export async function addAccount(clientId: string, formData: FormData) {
  const label = String(formData.get("label") ?? "").trim();
  const custodian = String(formData.get("custodian") ?? "").trim() || null;
  if (!label) return;
  const supabase = await requireSupabase();
  const { error } = await supabase.from("accounts").insert({ client_id: clientId, label, custodian });
  if (error) throw error;
  revalidatePath(`/clientes/${clientId}`);
}

export async function deleteAccount(clientId: string, accountId: string) {
  const supabase = await requireSupabase();
  const { error } = await supabase.from("accounts").delete().eq("id", accountId);
  if (error) throw error;
  revalidatePath(`/clientes/${clientId}`);
}

/** Manual monthly snapshot entry — the same shape a mocked/real statement extraction would produce. */
export async function saveSnapshotManual(clientId: string, accountId: string, formData: FormData) {
  const month = String(formData.get("month") ?? "");
  if (!/^\d{4}-\d{2}$/.test(month)) return;
  const num = (key: string) => {
    const raw = formData.get(key);
    if (raw === null || raw === "") return null;
    const n = Number(raw);
    return isNaN(n) ? null : n;
  };
  const moneda = String(formData.get("moneda") ?? "USD") || "USD";
  const tipoCambio = moneda === "USD" ? null : await fetchUsdExchangeRate(moneda, lastDayOfMonth(month));

  const supabase = await requireSupabase();
  const { error } = await supabase.from("snapshots").upsert(
    {
      account_id: accountId,
      month,
      valor_actual: num("valorActual"),
      valor_inicial: num("valorInicial"),
      flujos_netos: num("flujosNetos"),
      flujos_netos_ytd: num("flujosNetosYTD"),
      moneda,
      tipo_cambio: tipoCambio,
    },
    { onConflict: "account_id,month" },
  );
  if (error) throw error;
  revalidatePath(`/clientes/${clientId}`);
}

export async function deleteSnapshot(clientId: string, accountId: string, month: string) {
  const supabase = await requireSupabase();
  const { error } = await supabase.from("snapshots").delete().eq("account_id", accountId).eq("month", month);
  if (error) throw error;
  revalidatePath(`/clientes/${clientId}`);
}

/** Titularidad + TOD are compliance metadata on the account itself, not tied to any one month's snapshot. */
export async function updateAccountCompliance(clientId: string, accountId: string, formData: FormData) {
  const titularidad = String(formData.get("titularidad") ?? "") || null;
  const todCompletado = formData.get("todCompletado") === "on";
  const todFecha = String(formData.get("todFecha") ?? "") || null;
  const supabase = await requireSupabase();
  const { error } = await supabase
    .from("accounts")
    .update({ titularidad, tod_completado: todCompletado, tod_fecha: todCompletado ? todFecha : null })
    .eq("id", accountId);
  if (error) throw error;
  revalidatePath(`/clientes/${clientId}/cuentas/${accountId}`);
  revalidatePath(`/clientes/${clientId}/consolidado`);
  revalidatePath("/oficina");
}

/**
 * Overrides a single holding's US-situs classification within one month's snapshot.
 * Holdings are matched by exact `nombre` — the same JSONB blob a bulk-upload extraction
 * (or manual edit) would produce, so there's no stable id to key on instead.
 */
export async function updateHoldingUsSitus(
  clientId: string,
  accountId: string,
  month: string,
  holdingNombre: string,
  usSitus: boolean,
) {
  const supabase = await requireSupabase();
  const { data: row, error: fetchError } = await supabase
    .from("snapshots")
    .select("holdings")
    .eq("account_id", accountId)
    .eq("month", month)
    .single();
  if (fetchError) throw fetchError;

  const holdings = (row.holdings as Array<{ nombre: string; valor: number; retornoPct: number | null; usSitus?: boolean | null }>).map((h) =>
    h.nombre === holdingNombre ? { ...h, usSitus } : h,
  );
  const { error } = await supabase.from("snapshots").update({ holdings }).eq("account_id", accountId).eq("month", month);
  if (error) throw error;
  revalidatePath(`/clientes/${clientId}/cuentas/${accountId}`);
  revalidatePath(`/clientes/${clientId}/consolidado`);
  revalidatePath("/oficina");
}
