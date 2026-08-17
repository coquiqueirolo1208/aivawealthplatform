export interface WeeklySummaryData {
  advisorName: string;
  weekLabel: string;
  radar: { tareasVencidas: number; documentosPendientes: number; atrasos: number; riesgo: number };
  upcomingTasks: Array<{ clientName: string; title: string; due: string }>;
  upcomingBirthdays: Array<{ clientName: string; daysUntil: number }>;
  appUrl: string;
}

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

/** Pure HTML builder for the Monday-morning digest — no I/O, easy to snapshot/test. */
export function buildWeeklySummaryHtml(data: WeeklySummaryData): string {
  const { radar } = data;
  const radarRows = [
    ["Tareas vencidas", radar.tareasVencidas],
    ["Documentación pendiente / vencida", radar.documentosPendientes],
    ["Estados de cuenta atrasados", radar.atrasos],
    ["Desvíos de perfil de riesgo", radar.riesgo],
  ] as const;
  const radarTotal = radar.tareasVencidas + radar.documentosPendientes + radar.atrasos + radar.riesgo;

  const radarHtml = radarTotal === 0
    ? `<p style="color:#3a6b52;">Todo en orden — sin alertas pendientes en el Radar. 🎉</p>`
    : `<table style="width:100%; border-collapse:collapse; font-size:13px;">
        ${radarRows
          .filter(([, n]) => n > 0)
          .map(
            ([label, n]) =>
              `<tr><td style="padding:4px 0; color:#333;">${label}</td><td style="padding:4px 0; text-align:right; font-weight:600;">${n}</td></tr>`,
          )
          .join("")}
      </table>`;

  const tasksHtml = data.upcomingTasks.length === 0
    ? `<p style="color:#666; font-size:13px;">Sin tareas con vencimiento esta semana.</p>`
    : `<ul style="padding-left:18px; margin:0; font-size:13px;">
        ${data.upcomingTasks
          .map((t) => `<li style="margin-bottom:4px;"><strong>${escapeHtml(t.clientName)}</strong> — ${escapeHtml(t.title)} (vence ${t.due})</li>`)
          .join("")}
      </ul>`;

  const birthdaysHtml = data.upcomingBirthdays.length === 0
    ? `<p style="color:#666; font-size:13px;">Sin cumpleaños esta semana.</p>`
    : `<ul style="padding-left:18px; margin:0; font-size:13px;">
        ${data.upcomingBirthdays
          .map((b) => `<li style="margin-bottom:4px;">🎂 <strong>${escapeHtml(b.clientName)}</strong> — ${b.daysUntil === 0 ? "hoy" : `en ${b.daysUntil} día${b.daysUntil === 1 ? "" : "s"}`}</li>`)
          .join("")}
      </ul>`;

  return `
<div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width:560px; margin:0 auto; color:#1a1a1a;">
  <div style="background:#131f38; padding:20px 24px; border-radius:8px 8px 0 0;">
    <div style="color:#ede7da; font-size:18px; font-weight:700;">AIVA Wealth Platform</div>
    <div style="color:#ffffff; font-size:13px; margin-top:4px;">Resumen semanal — ${escapeHtml(data.weekLabel)}</div>
  </div>
  <div style="border:1px solid #e2e2e2; border-top:none; padding:20px 24px; border-radius:0 0 8px 8px;">
    <p style="font-size:14px;">Hola ${escapeHtml(data.advisorName)},</p>
    <h3 style="font-size:14px; margin:16px 0 8px;">Radar</h3>
    ${radarHtml}
    <h3 style="font-size:14px; margin:16px 0 8px;">Tareas con vencimiento esta semana</h3>
    ${tasksHtml}
    <h3 style="font-size:14px; margin:16px 0 8px;">Cumpleaños esta semana</h3>
    ${birthdaysHtml}
    <p style="margin-top:20px; font-size:13px;">
      <a href="${data.appUrl}/oficina" style="color:#B9975B; font-weight:600;">Ver todo en Mi Oficina →</a>
    </p>
  </div>
</div>`.trim();
}
