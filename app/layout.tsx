import type { Metadata } from "next";
import { cookies } from "next/headers";
import { montserrat, inter, ibmPlexMono } from "@/lib/fonts";
import { SiteHeader } from "@/components/site-header";
import { SectionNav } from "@/components/section-nav";
import { createClient } from "@/lib/supabase/server";
import { loadRadarData } from "@/lib/queries/radar";
import { countRadarAlerts } from "@/lib/finance/radar";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIVA Wealth Platform",
  description: "Reporting patrimonial multi-custodio para asesores AIVA",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value === "dark" ? "dark" : "light";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const alertCount = user ? countRadarAlerts(await loadRadarData(supabase, user.id)) : 0;

  return (
    <html
      lang="es"
      data-theme={theme}
      className={`${montserrat.variable} ${inter.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="mx-auto max-w-[1180px] px-5 pt-7 pb-15">
          <SiteHeader initialTheme={theme} userEmail={user?.email ?? null} />
          <SectionNav alertCount={alertCount} />
          {children}
        </div>
      </body>
    </html>
  );
}
