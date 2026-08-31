import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export interface PendingTask {
  id: string;
  title: string;
  due: string | null;
  clientId: string | null;
  clientName: string | null;
  prospectId: string | null;
  prospectName: string | null;
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
 * Pending tasks across every client AND prospect of this advisor, sorted by due
 * date (nulls last). Flat queries + a JS join, rather than a nested/embedded
 * select — this hand-written Database type has no FK relationship metadata for
 * supabase-js's typed embedding.
 */
export async function getPendingTasksForAdvisor(
  supabase: SupabaseClient<Database>,
  advisorId: string,
): Promise<PendingTask[]> {
  const [{ data: clients, error: clientsError }, { data: prospects, error: prospectsError }] = await Promise.all([
    supabase.from("clients").select("id, name").or(`advisor_id.eq.${advisorId},is_demo.eq.true`),
    supabase.from("prospects").select("id, name").eq("advisor_id", advisorId),
  ]);
  if (clientsError) throw clientsError;
  if (prospectsError) throw prospectsError;
  if (!clients?.length && !prospects?.length) return [];

  const clientNameById = new Map((clients ?? []).map((c) => [c.id, c.name]));
  const prospectNameById = new Map((prospects ?? []).map((p) => [p.id, p.name]));

  const orParts: string[] = [];
  if (clients?.length) orParts.push(`client_id.in.(${clients.map((c) => c.id).join(",")})`);
  if (prospects?.length) orParts.push(`prospect_id.in.(${prospects.map((p) => p.id).join(",")})`);
  if (!orParts.length) return [];

  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id, title, due, client_id, prospect_id")
    .or(orParts.join(","))
    .eq("done", false);
  if (tasksError) throw tasksError;

  return (tasks ?? [])
    .map((t) => ({
      id: t.id,
      title: t.title,
      due: t.due,
      clientId: t.client_id,
      clientName: t.client_id ? (clientNameById.get(t.client_id) ?? "—") : null,
      prospectId: t.prospect_id,
      prospectName: t.prospect_id ? (prospectNameById.get(t.prospect_id) ?? "—") : null,
    }))
    .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));
}
