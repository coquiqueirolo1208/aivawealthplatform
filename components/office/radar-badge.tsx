import { getCurrentUser, getRequestSupabase } from "@/lib/supabase/server";
import { loadRadarData } from "@/lib/queries/radar";
import { countRadarAlerts } from "@/lib/finance/radar";

/**
 * Alert count next to "Mi Oficina". Rendered inside <Suspense> so it streams in after
 * the page instead of the root layout blocking every page on the full Radar.
 * loadRadarData is memoized per request, so on /oficina this reuses the page's data.
 */
export async function RadarBadge() {
  const user = await getCurrentUser();
  if (!user) return null;
  let count: number;
  try {
    count = countRadarAlerts(await loadRadarData(await getRequestSupabase(), user.id));
  } catch {
    // A failing badge must never take the whole app down with it.
    return null;
  }
  if (count === 0) return null;
  return (
    <span
      className="ml-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 font-mono text-[10.5px] font-bold"
      style={{ background: "var(--brick)", color: "#fff" }}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
