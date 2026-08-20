"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireSupabase() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return supabase;
}

export async function addNote(clientId: string, formData: FormData) {
  const texto = String(formData.get("texto") ?? "").trim();
  if (!texto) return;
  const supabase = await requireSupabase();
  const { error } = await supabase.from("client_notes").insert({ client_id: clientId, texto });
  if (error) throw error;
  revalidatePath(`/clientes/${clientId}/consolidado`);
  revalidatePath("/oficina");
}

export async function deleteNote(clientId: string, noteId: string) {
  const supabase = await requireSupabase();
  const { error } = await supabase.from("client_notes").delete().eq("id", noteId);
  if (error) throw error;
  revalidatePath(`/clientes/${clientId}/consolidado`);
  revalidatePath("/oficina");
}
