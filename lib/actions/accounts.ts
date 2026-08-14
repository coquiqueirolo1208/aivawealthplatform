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
