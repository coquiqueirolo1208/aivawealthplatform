import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadRadarData } from "@/lib/queries/radar";
import { getPendingTasksForAdvisor } from "@/lib/queries/tasks";
import { getClientBirthdays } from "@/lib/queries/clients";
import { computeUpcomingBirthdays } from "@/lib/finance";
import { sendEmail } from "@/lib/email/smtp";
import { buildWeeklySummaryHtml } from "@/lib/email/weekly-summary";

// Triggered by Vercel Cron (see vercel.json: Mondays at 11:00 UTC = 08:00
// Montevideo/Buenos Aires, both UTC-3 year-round, no DST to account for).
// Protected by CRON_SECRET when set — Vercel sends it as a Bearer token
// automatically for scheduled invocations; without it, anyone could trigger
// mass emails by hitting this URL directly.
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: advisors, error } = await supabase
    .from("advisors")
    .select("id, name, email")
    .eq("weekly_email_enabled", true);
  if (error) throw error;

  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const in7DaysIso = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const weekLabel = today.toLocaleDateString("es-UY", { day: "numeric", month: "long", year: "numeric" });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.aivawealth.com";

  const results: Array<{ advisorId: string; sent: boolean }> = [];

  for (const advisor of advisors ?? []) {
    if (!advisor.email) {
      results.push({ advisorId: advisor.id, sent: false });
      continue;
    }

    const radarData = await loadRadarData(supabase, advisor.id);
    const pendingTasks = await getPendingTasksForAdvisor(supabase, advisor.id);
    const upcomingTasks = pendingTasks
      .filter((t) => t.due && t.due >= todayIso && t.due <= in7DaysIso)
      .map((t) => ({ clientName: t.clientName ?? `${t.prospectName} (prospecto)`, title: t.title, due: t.due! }));

    const birthdays = await getClientBirthdays(supabase, advisor.id);
    const upcomingBirthdays = computeUpcomingBirthdays(
      birthdays.map((c) => ({ id: c.id, name: c.name, fechaNacimiento: c.fechaNacimiento })),
      todayIso,
      10,
    )
      .filter((b) => b.daysUntil <= 7)
      .map((b) => ({ clientName: b.clientName, daysUntil: b.daysUntil }));

    const html = buildWeeklySummaryHtml({
      advisorName: advisor.name || advisor.email,
      weekLabel,
      radar: {
        tareasVencidas: radarData.tareas.length,
        documentosPendientes: radarData.documentos.length,
        atrasos: radarData.atrasos.length,
        riesgo: radarData.riesgo.length,
      },
      upcomingTasks,
      upcomingBirthdays,
      appUrl,
    });

    await sendEmail({ to: advisor.email, subject: `AIVA Wealth Platform — Resumen semanal (${weekLabel})`, html });
    results.push({ advisorId: advisor.id, sent: true });
  }

  return NextResponse.json({ processed: results.length, results });
}
