import { Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { montserrat, inter, ibmPlexMono } from "@/lib/fonts";
import { SiteHeader } from "@/components/site-header";
import { SectionNav } from "@/components/section-nav";
import { RadarBadge } from "@/components/office/radar-badge";
import { getCurrentUser } from "@/lib/supabase/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIVA Wealth Platform",
  description: "Reporting patrimonial multi-custodio para asesores AIVA",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value === "dark" ? "dark" : "light";
  const user = await getCurrentUser();

  return (
    <html
      lang="es"
      data-theme={theme}
      className={`${montserrat.variable} ${inter.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="mx-auto max-w-[1180px] px-5 pt-7 pb-15">
          <SiteHeader initialTheme={theme} userEmail={user?.email ?? null} />
          <SectionNav
            oficinaBadge={
              user ? (
                <Suspense fallback={null}>
                  <RadarBadge />
                </Suspense>
              ) : null
            }
          />
          {children}
        </div>
      </body>
    </html>
  );
}
