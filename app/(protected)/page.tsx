import Link from "next/link";

const CARDS = [
  {
    href: "/oficina",
    title: "Mi Oficina",
    desc: "Tu dashboard: AUM, comisiones, flujos de todos tus clientes, radar de alertas y configuración de tu cuenta.",
  },
  {
    href: "/clientes",
    title: "Mis Clientes",
    desc: "Buscá y abrí el consolidado, las cuentas y el PDF de cada cliente. Incluye tu pipeline de prospectos.",
  },
  {
    href: "/research",
    title: "Research",
    desc: "Perspectivas de mercado, análisis de fondos y portafolios modelo.",
  },
] as const;

export default function HomePage() {
  return (
    <div className="px-5 pt-15 pb-5 text-center">
      <div className="mb-11.5 text-[13.5px] text-(--muted)">Plataforma para asesores independientes</div>
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
