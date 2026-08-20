"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireAdvisorId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, advisorId: user.id };
}

export async function addClient(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const { supabase, advisorId } = await requireAdvisorId();
  const { data, error } = await supabase
    .from("clients")
    .insert({ advisor_id: advisorId, name })
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath("/clientes");
  redirect(`/clientes/${data.id}`);
}

/** FK cascade (ON DELETE CASCADE) takes care of accounts/snapshots/tasks/documents/etc. */
export async function deleteClient(clientId: string) {
  const { supabase } = await requireAdvisorId();
  const { error } = await supabase.from("clients").delete().eq("id", clientId);
  if (error) throw error;
  revalidatePath("/clientes");
}

export async function updateClientBirthday(clientId: string, fechaNacimiento: string) {
  const { supabase } = await requireAdvisorId();
  const { error } = await supabase
    .from("clients")
    .update({ fecha_nacimiento: fechaNacimiento || null })
    .eq("id", clientId);
  if (error) throw error;
  revalidatePath(`/clientes/${clientId}/consolidado`);
  revalidatePath("/oficina");
}

/** Free-text label linking separate client records (e.g. spouses) into one household for AUM roll-ups. */
export async function updateClientHousehold(clientId: string, householdLabel: string) {
  const { supabase } = await requireAdvisorId();
  const { error } = await supabase
    .from("clients")
    .update({ household_label: householdLabel.trim() || null })
    .eq("id", clientId);
  if (error) throw error;
  revalidatePath(`/clientes/${clientId}/consolidado`);
  revalidatePath("/clientes");
}

/** Only the MSCI World share is ever entered — Bloomberg Global Agg is always 100 minus that, enforced here too. */
export async function updateClientBenchmarkWeight(clientId: string, formData: FormData) {
  const raw = String(formData.get("msciPct") ?? "").trim();
  const msciPct = raw === "" ? null : Math.min(100, Math.max(0, Math.round(Number(raw))));
  if (raw !== "" && Number.isNaN(msciPct)) return;
  const { supabase } = await requireAdvisorId();
  const { error } = await supabase.from("clients").update({ benchmark_msci_pct: msciPct }).eq("id", clientId);
  if (error) throw error;
  revalidatePath(`/clientes/${clientId}/consolidado`);
}
