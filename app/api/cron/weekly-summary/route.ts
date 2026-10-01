import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadRadarData } from "@/lib/queries/radar";
import { getPendingTasksForAdvisor } from "@/lib/queries/tasks";
import { getClientBirthdays } from "@/lib/queries/clients";
import { computeUpcomingBirthdays } from "@/lib/finance";
import { sendEmail } from "@/lib/email/smtp";
import { buildWeeklySummaryHtml } from "@/lib/email/weekly-summary";
import { ADVISOR_TIME_ZONE, todayIso } from "@/lib/dates";

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
  const todayYmd = todayIso(today);
  const in7DaysIso = todayIso(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000));
  const weekLabel = today.toLocaleDateString("es-UY", { day: "numeric", month: "long", year: "numeric", timeZone: ADVISOR_TIME_ZONE });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.aivawealth.com";

  const results: Array<{ advisorId: string; sent: boolean }> = [];

  for (const advisor of advisors ?? []) {
    if (!advisor.email) {
      results.push({ advisorId: advisor.id, sent: false });
      continue;
    }

    // One advisor's failure (bad data, SMTP hiccup) must not stop the emails for
    // everyone after them in the loop.
    try {
      const radarData = await loadRadarData(supabase, advisor.id);
      const pendingTasks = await getPendingTasksForAdvisor(supabase, advisor.id);
      const upcomingTasks = pendingTasks
        .filter((t) => t.due && t.due >= todayYmd && t.due <= in7DaysIso)
        .map((t) => ({ clientName: t.clientName ?? `${t.prospectName} (prospecto)`, title: t.title, due: t.due! }));

      const birthdays = await getClientBirthdays(supabase, advisor.id);
      const upcomingBirthdays = computeUpcomingBirthdays(
        birthdays.map((c) => ({ id: c.id, name: c.name, fechaNacimiento: c.fechaNacimiento })),
        todayYmd,
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
          usSitus: radarData.usSitusRiesgo.length,
          todPendiente: radarData.todPendiente.length,
          sinContacto: radarData.contactoPendiente.length,
          fondeoPendiente: radarData.fondeoPendiente.length,
        },
        upcomingTasks,
        upcomingBirthdays,
        appUrl,
      });

      await sendEmail({ to: advisor.email, subject: `AIVA Wealth Platform — Resumen semanal (${weekLabel})`, html });
      results.push({ advisorId: advisor.id, sent: true });
    } catch (err) {
      console.error(`weekly-summary failed for advisor ${advisor.id}:`, err);
      results.push({ advisorId: advisor.id, sent: false });
    }
  }

  return NextResponse.json({ processed: results.length, sent: results.filter((r) => r.sent).length });
}
