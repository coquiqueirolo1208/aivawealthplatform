import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadRadarData } from "@/lib/queries/radar";
import { SearchableSectionList } from "@/components/office/searchable-section-list";

const SECTION_TITLES = {
  tareas: "Tareas vencidas",
  documentos: "Documentación KYC pendiente / vencida",
  atrasos: "Estados de cuenta atrasados",
  riesgo: "Desvíos de perfil de riesgo",
} as const;

type Section = keyof typeof SECTION_TITLES;

function isSection(value: string): value is Section {
  return value in SECTION_TITLES;
}

export default async function RadarSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!isSection(section)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const data = await loadRadarData(supabase, user.id);
  const items = data[section];

  return (
    <div>
      <Link href="/oficina" className="mb-3 inline-block text-[13px] text-(--brass) underline">
        ← Volver a Mi Oficina
      </Link>
      <h2 className="mb-4 font-heading text-xl font-semibold text-(--paper)">
        {SECTION_TITLES[section]} ({items.length})
      </h2>
      <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
        {items.length === 0 ? (
          <div className="p-6 text-center text-[13px] text-(--muted)">No hay elementos pendientes en esta categoría.</div>
        ) : section === "tareas" ? (
          <SearchableSectionList kind="tareas" items={data.tareas} />
        ) : section === "documentos" ? (
          <SearchableSectionList kind="documentos" items={data.documentos} />
        ) : section === "atrasos" ? (
          <SearchableSectionList kind="atrasos" items={data.atrasos} />
        ) : (
          <SearchableSectionList kind="riesgo" items={data.riesgo} />
        )}
      </div>
    </div>
  );
}
