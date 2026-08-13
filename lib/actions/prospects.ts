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

export async function addProspect(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const { supabase, advisorId } = await requireAdvisorId();
  const aumRaw = String(formData.get("aumEstimado") ?? "").replace(/[^0-9.]/g, "");
  const { error } = await supabase.from("prospects").insert({
    advisor_id: advisorId,
    name,
    empresa: String(formData.get("empresa") ?? "") || null,
    fuente: String(formData.get("fuente") ?? "") || null,
    aum_estimado: aumRaw ? Number(aumRaw) : null,
    proxima_accion: String(formData.get("proximaAccion") ?? "") || null,
    proxima_fecha: String(formData.get("proximaFecha") ?? "") || null,
    notas: String(formData.get("notas") ?? "") || null,
    stage: "nuevo",
  });
  if (error) throw error;
  revalidatePath("/clientes");
}

export async function updateProspectStage(prospectId: string, stage: string) {
  const { supabase } = await requireAdvisorId();
  const { error } = await supabase.from("prospects").update({ stage }).eq("id", prospectId);
  if (error) throw error;
  revalidatePath("/clientes");
}

export async function deleteProspect(prospectId: string) {
  const { supabase } = await requireAdvisorId();
  const { error } = await supabase.from("prospects").delete().eq("id", prospectId);
  if (error) throw error;
  revalidatePath("/clientes");
}

export async function convertProspect(prospectId: string, name: string) {
  const { supabase, advisorId } = await requireAdvisorId();
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({ advisor_id: advisorId, name })
    .select("id")
    .single();
  if (clientError) throw clientError;
  const { error } = await supabase.from("prospects").update({ converted_client_id: client.id }).eq("id", prospectId);
  if (error) throw error;
  revalidatePath("/clientes");
  return client.id;
}
