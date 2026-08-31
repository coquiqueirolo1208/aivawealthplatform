"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markTaskDone(taskId: string) {
  const supabase = await createClient();
  const { data: task, error } = await supabase
    .from("tasks")
    .update({ done: true })
    .eq("id", taskId)
    .select("client_id, prospect_id")
    .single();
  if (error) throw error;
  revalidatePath("/oficina");
  revalidatePath("/oficina/tareas-pendientes");
  revalidatePath("/oficina/radar/tareas");
  revalidatePath("/clientes");
  revalidatePath("/prospectos");
  if (task?.client_id) revalidatePath(`/clientes/${task.client_id}/consolidado`);
}

export async function addTask(clientId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const due = String(formData.get("due") ?? "") || null;
  if (!title) return;
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({ client_id: clientId, title, due });
  if (error) throw error;
  revalidatePath(`/clientes/${clientId}/consolidado`);
  revalidatePath("/oficina");
  revalidatePath("/oficina/tareas-pendientes");
}

export async function addProspectTask(prospectId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const due = String(formData.get("due") ?? "") || null;
  if (!title) return;
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({ prospect_id: prospectId, title, due });
  if (error) throw error;
  revalidatePath("/prospectos");
  revalidatePath("/oficina");
  revalidatePath("/oficina/tareas-pendientes");
}
