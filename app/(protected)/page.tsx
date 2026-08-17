import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAdvisorLogoUrl } from "@/lib/queries/advisor";

const CARDS = [
  {
    href: "/oficina",
    title: "Mi Oficina",
    desc: "Tu dashboard: AUM, comisiones, flujos de todos tus clientes, radar de alertas y configuración de tu cuenta.",
  },
  {
    href: "/clientes",
    title: "Mis Clientes",
    desc: "Buscá y abrí el consolidado, las cuentas y el PDF de cada cliente.",
  },
  {
    href: "/prospectos",
    title: "Prospectos",
    desc: "Pipeline de prospección: alta de nuevos prospectos, seguimiento por etapa e indicadores de conversión.",
  },
  {
    href: "/research",
    title: "Research",
    desc: "Perspectivas de mercado, análisis de fondos y portafolios modelo.",
  },
] as const;

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Only this advisor's own clients/prospects count toward "getting started" — shared
  // demo clients are visible to everyone, so they'd make the checklist look done
  // for an advisor who hasn't actually set anything up yet.
  const [logoUrl, clientCount, prospectCount] = await Promise.all([
    getAdvisorLogoUrl(supabase, user.id),
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("advisor_id", user.id),
    supabase.from("prospects").select("id", { count: "exact", head: true }).eq("advisor_id", user.id),
  ]);

  const steps = [
    { done: !!logoUrl, label: "Subí el logo de tu oficina", href: "/clientes", cta: "Subir logo" },
    { done: (prospectCount.count ?? 0) > 0, label: "Agregá tu primer prospecto", href: "/prospectos", cta: "Agregar prospecto" },
    { done: (clientCount.count ?? 0) > 0, label: "Cargá tu primer cliente", href: "/clientes", cta: "Agregar cliente" },
  ];
  const allDone = steps.every((s) => s.done);

  return (
    <div className="px-5 pt-15 pb-5 text-center">
      <div className="mb-11.5 text-[13.5px] text-(--muted)">Plataforma para asesores independientes</div>

      {!allDone && (
        <div className="mx-auto mb-8 max-w-[520px] rounded-[10px] border border-(--line) bg-(--panel) p-5 text-left">
          <h3 className="mb-3 font-heading text-base font-semibold text-(--paper)">Primeros pasos</h3>
          {steps.map((s) => (
            <Link
              key={s.href + s.label}
              href={s.href}
              className="row-hover mb-1.5 flex items-center justify-between rounded-lg px-3.5 py-2.5 text-[13px]"
              style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}
            >
              <span className={s.done ? "text-(--muted) line-through" : "text-(--paper)"}>
                {s.done ? "✓" : "○"} {s.label}
              </span>
              {!s.done && <span className="text-[11px] font-semibold text-(--brass)">{s.cta} →</span>}
            </Link>
          ))}
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-4.5">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="w-[250px] rounded-[10px] border p-4.5 text-left"
            style={{ background: "var(--brass)", borderColor: "var(--brass)" }}
          >
            <h3 className="mt-0 font-heading text-base font-semibold text-(--ink)">{c.title}</h3>
            <p className="text-[13px] leading-relaxed text-(--ink) opacity-85">{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
