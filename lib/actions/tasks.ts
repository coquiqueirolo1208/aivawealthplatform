"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Every screen that lists tasks: Mi Oficina, its task/radar pages, the client's consolidado, prospects. */
function revalidateTaskPaths(task: { client_id: string | null; prospect_id: string | null } | null) {
  revalidatePath("/oficina");
  revalidatePath("/oficina/tareas-pendientes");
  revalidatePath("/oficina/radar/tareas");
  revalidatePath("/clientes");
  revalidatePath("/prospectos");
  if (task?.client_id) revalidatePath(`/clientes/${task.client_id}/consolidado`);
}

async function setDone(taskId: string, done: boolean) {
  const supabase = await createClient();
  const { data: task, error } = await supabase
    .from("tasks")
    .update({ done })
    .eq("id", taskId)
    .select("client_id, prospect_id")
    .single();
  if (error) throw error;
  revalidateTaskPaths(task);
}

export async function markTaskDone(taskId: string) {
  await setDone(taskId, true);
}

/** Undo for a task marked done by mistake. */
export async function reopenTask(taskId: string) {
  await setDone(taskId, false);
}

export async function updateTask(taskId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const due = String(formData.get("due") ?? "") || null;
  if (!title) return;
  const supabase = await createClient();
  const { data: task, error } = await supabase
    .from("tasks")
    .update({ title, due })
    .eq("id", taskId)
    .select("client_id, prospect_id")
    .single();
  if (error) throw error;
  revalidateTaskPaths(task);
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient();
  const { data: task, error } = await supabase.from("tasks").delete().eq("id", taskId).select("client_id, prospect_id").maybeSingle();
  if (error) throw error;
  revalidateTaskPaths(task);
}

export async function addTask(clientId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const due = String(formData.get("due") ?? "") || null;
  if (!title) return;
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({ client_id: clientId, title, due });
  if (error) throw error;
  revalidateTaskPaths({ client_id: clientId, prospect_id: null });
}

export async function addProspectTask(prospectId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const due = String(formData.get("due") ?? "") || null;
  if (!title) return;
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({ prospect_id: prospectId, title, due });
  if (error) throw error;
  revalidateTaskPaths({ client_id: null, prospect_id: prospectId });
}
