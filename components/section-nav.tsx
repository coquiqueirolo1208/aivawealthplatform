"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = [
  { href: "/oficina", label: "Mi Oficina" },
  { href: "/clientes", label: "Mis Clientes" },
  { href: "/research", label: "Research" },
] as const;

export function SectionNav() {
  const pathname = usePathname();
  if (pathname === "/" || pathname === "/login") return null;

  return (
    <nav className="mb-5 flex flex-wrap gap-1.5">
      {SECTIONS.map((s) => {
        const active = pathname.startsWith(s.href);
        return (
          <Link
            key={s.href}
            href={s.href}
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13.5px] font-semibold"
            style={{
              background: active ? "var(--paper)" : "var(--brass)",
              color: "var(--ink)",
              border: `1px solid ${active ? "var(--paper)" : "var(--brass)"}`,
            }}
          >
            <span
              className="h-[7px] w-[7px] rounded-full"
              style={{ background: "var(--ink)", opacity: active ? 1 : 0.55 }}
            />
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}
