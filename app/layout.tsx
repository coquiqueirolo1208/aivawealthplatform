import type { Metadata } from "next";
import { cookies } from "next/headers";
import { montserrat, inter, ibmPlexMono } from "@/lib/fonts";
import { SiteHeader } from "@/components/site-header";
import { SectionNav } from "@/components/section-nav";
import { createClient } from "@/lib/supabase/server";
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

  return (
    <html
      lang="es"
      data-theme={theme}
      className={`${montserrat.variable} ${inter.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="mx-auto max-w-[1180px] px-5 pt-7 pb-15">
          <SiteHeader initialTheme={theme} userEmail={user?.email ?? null} />
          <SectionNav />
          {children}
          <div className="mt-6.5 text-center text-[11px] leading-relaxed text-(--muted)">
            Los datos se extraen automáticamente de los estados de cuenta que subís, usando IA — verificá cifras
            clave contra el documento original.
            <br />
            Plataforma AIVA — datos compartidos entre tus dispositivos, aislados por asesor.
          </div>
        </div>
      </body>
    </html>
  );
}
