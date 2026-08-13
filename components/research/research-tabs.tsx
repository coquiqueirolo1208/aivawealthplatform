"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  ["mercados", "Mercados"],
  ["informe", "Informe Diario"],
  ["portafolios", "Portafolios Modelo"],
  ["soluciones", "Soluciones Investec"],
  ["ideas", "Mejores Ideas"],
  ["fondos", "Buscador de Fondos"],
  ["comparativo", "Comparativo"],
] as const;

export function ResearchTabs() {
  const pathname = usePathname();

  return (
    <nav className="mb-5 flex flex-wrap gap-1.5">
      {TABS.map(([id, label]) => {
        const active = pathname === `/research/${id}`;
        return (
          <Link
            key={id}
            href={`/research/${id}`}
            className="rounded-full px-3.5 py-1.5 text-[12.5px] font-medium"
            style={{
              background: active ? "transparent" : "var(--panel-2)",
              border: `1px solid ${active ? "var(--brass)" : "var(--line)"}`,
              color: active ? "var(--brass)" : "var(--paper-dim)",
            }}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
