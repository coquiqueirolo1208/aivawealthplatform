"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB per file — statements/PDFs, not huge media
const MAX_FILES = 6;

async function requireSupabase() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return supabase;
}

/**
 * Logs a "pedir propuesta" request for a prospect, with optional file attachments
 * (account statement, etc). No email integration yet — this is purely an internal
 * record the advisor can see and revisit on the prospect's card.
 */
export async function requestProposal(prospectId: string, formData: FormData) {
  const supabase = await requireSupabase();

  const montoRaw = String(formData.get("montoEstimado") ?? "").replace(/[^0-9.]/g, "");
  const horizonte = String(formData.get("horizonte") ?? "") || null;
  const perfil = String(formData.get("perfil") ?? "") || null;
  const comentarios = String(formData.get("comentarios") ?? "") || null;

  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, MAX_FILES);

  const attachments: Array<{ path: string; name: string }> = [];
  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) continue;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
    const path = `${prospectId}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("proposal-attachments")
      .upload(path, file, { contentType: file.type || undefined });
    if (uploadError) throw uploadError;
    attachments.push({ path, name: file.name });
  }

  const { error } = await supabase.from("proposal_requests").insert({
    prospect_id: prospectId,
    monto_estimado: montoRaw ? Number(montoRaw) : null,
    horizonte,
    perfil,
    comentarios,
    attachments,
  });
  if (error) throw error;
  revalidatePath("/prospectos");
}

export async function deleteProposalRequest(requestId: string, attachmentPaths: string[]) {
  const supabase = await requireSupabase();
  if (attachmentPaths.length) {
    await supabase.storage.from("proposal-attachments").remove(attachmentPaths);
  }
  const { error } = await supabase.from("proposal_requests").delete().eq("id", requestId);
  if (error) throw error;
  revalidatePath("/prospectos");
}
