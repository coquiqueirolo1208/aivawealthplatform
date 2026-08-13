"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markTaskDone(taskId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update({ done: true }).eq("id", taskId);
  if (error) throw error;
  revalidatePath("/oficina");
  revalidatePath("/clientes");
}

export async function addTask(clientId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const due = String(formData.get("due") ?? "") || null;
  if (!title) return;
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({ client_id: clientId, title, due });
  if (error) throw error;
  revalidatePath(`/clientes/${clientId}`);
  revalidatePath("/oficina");
}
