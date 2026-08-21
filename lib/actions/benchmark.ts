"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveBenchmarkLevel(formData: FormData) {
  const month = String(formData.get("month") ?? "");
  if (!/^\d{4}-\d{2}$/.test(month)) return;
  const msci = formData.get("msci") ? Number(formData.get("msci")) : null;
  const agg = formData.get("agg") ? Number(formData.get("agg")) : null;

  const supabase = await createClient();
  const { error } = await supabase.from("benchmark_levels").upsert({ month, msci, agg });
  if (error) throw error;
  revalidatePath("/clientes", "layout");
}

export async function deleteBenchmarkLevel(month: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("benchmark_levels").delete().eq("month", month);
  if (error) throw error;
  revalidatePath("/clientes", "layout");
}

/** Only the MSCI World share is ever entered — Bloomberg Global Agg is always 100 minus that, enforced here too. */
export async function saveClientBenchmarkWeight(clientId: string, formData: FormData) {
  const month = String(formData.get("month") ?? "");
  if (!/^\d{4}-\d{2}$/.test(month)) return;
  const raw = String(formData.get("msciPct") ?? "").trim();
  if (raw === "") return;
  const msciPct = Math.min(100, Math.max(0, Math.round(Number(raw))));
  if (Number.isNaN(msciPct)) return;

  const supabase = await createClient();
  const { error } = await supabase.from("client_benchmark_weights").upsert({ client_id: clientId, month, msci_pct: msciPct });
  if (error) throw error;
  revalidatePath(`/clientes/${clientId}/consolidado`);
}

export async function deleteClientBenchmarkWeight(clientId: string, month: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("client_benchmark_weights")
    .delete()
    .eq("client_id", clientId)
    .eq("month", month);
  if (error) throw error;
  revalidatePath(`/clientes/${clientId}/consolidado`);
}
