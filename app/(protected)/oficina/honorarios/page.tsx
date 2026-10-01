import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { loadFeesData } from "@/lib/queries/fees";
import { lastClosedQuarter, quarterLabel, quarterMonths, shiftQuarter } from "@/lib/finance";
import { fmtUSD } from "@/lib/format";
import { todayIso } from "@/lib/dates";
import { FeesTable } from "@/components/office/fees-table";

export default async function HonorariosPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { supabase, user } = await requireUser();
  const defaultQuarter = lastClosedQuarter(todayIso());
  const quarter = q && /^\d{4}-Q[1-4]$/.test(q) ? q : defaultQuarter;
  const data = await loadFeesData(supabase, user.id, quarter);
  const label = quarterLabel(quarter);
  const [firstMonth, , lastMonth] = quarterMonths(quarter);
  const inProgress = quarter > defaultQuarter;

  return (
    <div>
      <Link href="/oficina" className="mb-3 inline-block text-[13px] text-(--brass) underline">
        ← Volver a Mi Oficina
      </Link>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-xl font-semibold text-(--paper)">Honorarios</h2>
        <div className="flex items-center gap-2 text-[13px]">
          <Link href={`/oficina/honorarios?q=${shiftQuarter(quarter, -1)}`} className="secondary rounded-md px-2.5 py-1" aria-label="Trimestre anterior">
            ←
          </Link>
          <span className="min-w-20 text-center font-semibold text-(--paper)">{label}</span>
          <Link href={`/oficina/honorarios?q=${shiftQuarter(quarter, 1)}`} className="secondary rounded-md px-2.5 py-1" aria-label="Trimestre siguiente">
            →
          </Link>
        </div>
      </div>

      <p className="mb-4 text-[12.5px] text-(--muted)">
        Honorario trimestral = % anual ÷ 4 sobre el promedio del AUM de fin de mes ({firstMonth.slice(5)}–{lastMonth.slice(5)}/
        {quarter.slice(0, 4)}) según los estados de cuenta, con el mínimo anual ÷ 4 si corresponde. Al facturar, el monto queda
        guardado y ya no cambia aunque cargues o corrijas estados después.
        {inProgress && <span className="font-semibold text-(--brass)"> Este trimestre todavía no cerró: las cifras son parciales.</span>}
      </p>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Total del trimestre" value={fmtUSD(data.total)} hint="facturado + estimado sin facturar" />
        <Tile label="Sin facturar" value={fmtUSD(data.sinFacturar)} />
        <Tile label="Facturado, a cobrar" value={fmtUSD(data.facturado - data.cobrado)} />
        <Tile label="Cobrado" value={fmtUSD(data.cobrado)} />
      </div>

      <FeesTable rows={data.rows} quarter={quarter} quarterLabel={label} />
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[10px] border border-(--line) bg-(--panel) p-4">
      <div className="text-[11px] font-semibold tracking-[0.04em] text-(--muted) uppercase">{label}</div>
      <div className="mt-1.5 font-mono text-[20px] font-semibold text-(--paper)">{value}</div>
      {hint && <div className="mt-0.5 text-[10.5px] text-(--muted)">{hint}</div>}
    </div>
  );
}
