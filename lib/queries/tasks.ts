import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export interface PendingTask {
  id: string;
  title: string;
  due: string | null;
  clientId: string;
  clientName: string;
}

export interface ClientTask {
  id: string;
  title: string;
  due: string | null;
  done: boolean;
}

/** All tasks (pending and done) for a single client, pending-first then soonest-due. */
export async function getTasksForClient(supabase: SupabaseClient<Database>, clientId: string): Promise<ClientTask[]> {
  const { data, error } = await supabase.from("tasks").select("id, title, due, done").eq("client_id", clientId);
  if (error) throw error;
  return (data ?? []).sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return (a.due ?? "9999").localeCompare(b.due ?? "9999");
  });
}

/**
 * Pending tasks across every client of this advisor, sorted by due date (nulls last).
 * Two flat queries + a JS join, rather than a nested/embedded select — this hand-written
 * Database type has no FK relationship metadata for supabase-js's typed embedding.
 */
export async function getPendingTasksForAdvisor(
  supabase: SupabaseClient<Database>,
  advisorId: string,
): Promise<PendingTask[]> {
  const { data: clients, error: clientsError } = await supabase
    .from("clients")
    .select("id, name")
    .or(`advisor_id.eq.${advisorId},is_demo.eq.true`);
  if (clientsError) throw clientsError;
  if (!clients?.length) return [];

  const nameById = new Map(clients.map((c) => [c.id, c.name]));
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id, title, due, client_id")
    .in(
      "client_id",
      clients.map((c) => c.id),
    )
    .eq("done", false);
  if (tasksError) throw tasksError;

  return (tasks ?? [])
    .map((t) => ({
      id: t.id,
      title: t.title,
      due: t.due,
      clientId: t.client_id,
      clientName: nameById.get(t.client_id) ?? "—",
    }))
    .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));
}
