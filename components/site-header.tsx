"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoMark } from "./logo-mark";
import { getClientCookie, setClientCookie } from "@/lib/client-cookies";
import { createClient } from "@/lib/supabase/client";
import { t, type Language } from "@/lib/i18n";
import { IaAdvisorModal } from "@/components/ia-advisor-modal";

export function SiteHeader({
  initialTheme,
  userEmail,
}: {
  initialTheme: "light" | "dark";
  userEmail: string | null;
}) {
  const router = useRouter();
  const [theme, setTheme] = useState<"light" | "dark">(initialTheme);
  const [lang, setLang] = useState<Language>("es");
  const [now, setNow] = useState<string | null>(null);
  const [showAssistant, setShowAssistant] = useState(false);

  useEffect(() => {
    // One-time hydration from browser-only sources (cookie, clock) unavailable during SSR.
    const savedLang = getClientCookie("lang") as Language | null;
    if (savedLang === "es" || savedLang === "en" || savedLang === "pt") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from a cookie, not a render loop
      setLang(savedLang);
    }
    setNow(new Date().toLocaleString());
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    setClientCookie("theme", next);
  }

  function changeLang(next: Language) {
    setLang(next);
    setClientCookie("lang", next);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="top sticky top-0 z-[1000] flex flex-wrap items-end justify-between gap-2.5 border-b border-(--line) bg-(--ink) py-3.5 pb-4.5">
      <div>
        <Link
          href="/"
          className="flex items-center gap-2 font-heading text-[28px] font-semibold tracking-[0.2px] text-(--paper)"
          title="Ir al inicio"
        >
          <LogoMark />
          Wealth Platform
        </Link>
        <div className="mt-1 text-[12.5px] tracking-[0.3px] text-(--muted)">
          Reporting patrimonial multi-custodio · asignación, rendimiento y perspectivas
        </div>
      </div>
      <div className="text-right">
        <div className="font-mono text-[11px] text-(--muted)">
          {userEmail && <span className="mr-2">{userEmail}</span>}
          {now ?? "—"}
        </div>
        {userEmail && (
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-2 mr-1.5 rounded-md border border-(--line) bg-transparent px-4 py-2 text-[13px] font-semibold text-(--paper-dim)"
          >
            Cerrar sesión
          </button>
        )}
        {userEmail && (
          <button
            type="button"
            onClick={() => setShowAssistant(true)}
            className="mt-2 rounded-md border border-(--line) bg-transparent px-4 py-2 text-[13px] font-semibold text-(--paper-dim)"
            title="Asistente: preguntá sobre research o sobre tu cartera de clientes"
          >
            🤖 {t(lang, "research_assistant")}
          </button>
        )}
        {userEmail && showAssistant && <IaAdvisorModal onClose={() => setShowAssistant(false)} />}
        <select
          value={lang}
          onChange={(e) => changeLang(e.target.value as Language)}
          className="mt-2 ml-1.5 rounded-md border border-(--line) bg-transparent px-4 py-2 text-[13px] font-semibold text-(--paper-dim)"
        >
          <option value="es">Español</option>
          <option value="en">English</option>
          <option value="pt">Português</option>
        </select>
        <label className="ml-1.5 mt-2 inline-flex cursor-pointer items-center gap-1.5 align-middle">
          <span className="text-[11.5px] text-(--paper-dim)">
            {theme === "dark" ? t(lang, "dark_mode") : t(lang, "light_mode")}
          </span>
          <span
            onClick={toggleTheme}
            className="relative inline-block h-6 w-[42px] rounded-full transition-colors"
            style={{ background: "var(--line)" }}
          >
            <span
              className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left]"
              style={{ left: theme === "dark" ? 20 : 2 }}
            />
          </span>
        </label>
      </div>
    </header>
  );
}
