"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addDocument(clientId: string, formData: FormData) {
  const tipo = String(formData.get("tipo") ?? "").trim();
  if (!tipo) return;
  const estado = String(formData.get("estado") ?? "pendiente");
  const vencimiento = String(formData.get("vencimiento") ?? "") || null;
  const notas = String(formData.get("notas") ?? "") || null;

  const supabase = await createClient();
  const { error } = await supabase.from("client_documents").insert({ client_id: clientId, tipo, estado, vencimiento, notas });
  if (error) throw error;
  revalidatePath(`/clientes/${clientId}`);
}

export async function deleteDocument(clientId: string, docId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("client_documents").delete().eq("id", docId);
  if (error) throw error;
  revalidatePath(`/clientes/${clientId}`);
}
