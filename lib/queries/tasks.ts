import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export interface PendingTask {
  id: string;
  title: string;
  due: string | null;
  clientId: string;
  clientName: string;
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
    .eq("advisor_id", advisorId);
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
