import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPendingTasksForAdvisor } from "@/lib/queries/tasks";
import { SearchableSectionList } from "@/components/office/searchable-section-list";

export default async function TareasPendientesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Same "not overdue" filter as the capped list on Mi Oficina — overdue tasks
  // live in Radar's "Tareas vencidas" instead.
  const todayIso = new Date().toISOString().slice(0, 10);
  const upcomingTasks = (await getPendingTasksForAdvisor(supabase, user.id)).filter((t) => !t.due || t.due >= todayIso);

  return (
    <div>
      <Link href="/oficina" className="mb-3 inline-block text-[13px] text-(--brass) underline">
        ← Volver a Mi Oficina
      </Link>
      <h2 className="mb-4 font-heading text-xl font-semibold text-(--paper)">
        Tareas Pendientes No Vencidas ({upcomingTasks.length})
      </h2>
      <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
        {upcomingTasks.length === 0 ? (
          <div className="p-6 text-center text-[13px] text-(--muted)">No hay tareas pendientes.</div>
        ) : (
          <SearchableSectionList kind="pendientes" items={upcomingTasks} />
        )}
      </div>
    </div>
  );
}
