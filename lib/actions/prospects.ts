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
  revalidatePath("/prospectos");
}

export async function updateProspectStage(prospectId: string, stage: string) {
  const { supabase } = await requireAdvisorId();
  const { error } = await supabase.from("prospects").update({ stage }).eq("id", prospectId);
  if (error) throw error;
  revalidatePath("/clientes");
  revalidatePath("/prospectos");
}

export async function updateProspect(prospectId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const { supabase } = await requireAdvisorId();
  const aumRaw = String(formData.get("aumEstimado") ?? "").replace(/[^0-9.]/g, "");
  const { error } = await supabase
    .from("prospects")
    .update({
      name,
      empresa: String(formData.get("empresa") ?? "") || null,
      fuente: String(formData.get("fuente") ?? "") || null,
      aum_estimado: aumRaw ? Number(aumRaw) : null,
      proxima_accion: String(formData.get("proximaAccion") ?? "") || null,
      proxima_fecha: String(formData.get("proximaFecha") ?? "") || null,
      notas: String(formData.get("notas") ?? "") || null,
    })
    .eq("id", prospectId);
  if (error) throw error;
  revalidatePath("/clientes");
  revalidatePath("/prospectos");
}

export async function deleteProspect(prospectId: string) {
  const { supabase } = await requireAdvisorId();
  // Remove proposal attachments first: the row delete cascades proposal_requests, but
  // the storage objects would stay behind — and once the prospect is gone, the
  // bucket's ownership policy (joined through prospects) blocks deleting them.
  const { data: files } = await supabase.storage.from("proposal-attachments").list(prospectId);
  if (files?.length) {
    await supabase.storage.from("proposal-attachments").remove(files.map((f) => `${prospectId}/${f.name}`));
  }
  const { error } = await supabase.from("prospects").delete().eq("id", prospectId);
  if (error) throw error;
  revalidatePath("/clientes");
  revalidatePath("/prospectos");
}

export async function convertProspect(prospectId: string, name: string) {
  const { supabase, advisorId } = await requireAdvisorId();
  // Idempotent: a second click (or a retry) returns the client already created
  // instead of inserting a duplicate.
  const { data: prospect, error: prospectError } = await supabase
    .from("prospects")
    .select("converted_client_id, empresa, fuente, aum_estimado, notas")
    .eq("id", prospectId)
    .single();
  if (prospectError) throw prospectError;
  if (prospect.converted_client_id) return prospect.converted_client_id;

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({ advisor_id: advisorId, name })
    .select("id")
    .single();
  if (clientError) throw clientError;
  const { error } = await supabase.from("prospects").update({ converted_client_id: client.id }).eq("id", prospectId);
  if (error) throw error;

  // Carry what was learned during prospecting into the new client file, instead of
  // leaving it behind on a prospect card nobody opens again.
  const resumen = [
    prospect.empresa && `Empresa: ${prospect.empresa}`,
    prospect.fuente && `Fuente: ${prospect.fuente}`,
    prospect.aum_estimado != null && `AUM estimado como prospecto: USD ${prospect.aum_estimado.toLocaleString("en-US")}`,
    prospect.notas && `Notas: ${prospect.notas}`,
  ].filter(Boolean);
  if (resumen.length) {
    const { error: noteError } = await supabase
      .from("client_notes")
      .insert({ client_id: client.id, texto: `Convertido desde prospecto.\n${resumen.join("\n")}` });
    if (noteError) throw noteError;
  }
  // Pending tasks follow the person to their client file. Both columns change in the
  // same update so the "exactly one of client/prospect" check holds. Completed tasks
  // stay with the prospect as its history.
  const { error: tasksError } = await supabase
    .from("tasks")
    .update({ client_id: client.id, prospect_id: null })
    .eq("prospect_id", prospectId)
    .eq("done", false);
  if (tasksError) throw tasksError;

  revalidatePath("/clientes");
  revalidatePath("/prospectos");
  revalidatePath("/tareas-pendientes");
  return client.id;
}
