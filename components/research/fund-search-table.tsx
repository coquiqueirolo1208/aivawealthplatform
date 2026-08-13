"use client";

import { useMemo, useState } from "react";
import { buildFundIndexSeries, computeFundRisk } from "@/lib/finance";
import type { FundRow } from "@/lib/finance/types";
import { fmtPct, pctClass } from "@/lib/format";
import { FundIndexLine } from "@/components/charts/fund-index-line";

type SortKey = "name" | "cat" | "rt" | "ytd" | "y1" | "y3" | "y5" | "sh3" | "sh5";

function starRating(rt: number | null | undefined) {
  if (rt == null || isNaN(rt)) return "—";
  const n = Math.round(rt);
  return "★".repeat(Math.max(0, Math.min(5, n))) + "☆".repeat(5 - Math.max(0, Math.min(5, n)));
}

function Th({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  sort: { key: SortKey; dir: "asc" | "desc" };
  onSort: (key: SortKey) => void;
}) {
  return (
    <th className="cursor-pointer text-right select-none" onClick={() => onSort(sortKey)}>
      {label}
      {sort.key === sortKey ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
    </th>
  );
}

export function FundSearchTable({ funds }: { funds: FundRow[] }) {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "ytd", dir: "desc" });
  const [selected, setSelected] = useState<FundRow | null>(null);

  const categories = useMemo(() => Array.from(new Set(funds.map((f) => f.cat).filter(Boolean))).sort() as string[], [funds]);

  const rows = useMemo(() => {
    const s = search.trim().toUpperCase();
    let filtered = funds.filter((f) => (!cat || f.cat === cat) && (!s || f.name.toUpperCase().includes(s) || f.isin.toUpperCase().includes(s)));
    filtered = filtered.slice().sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      const aNull = av == null || av === "";
      const bNull = bv == null || bv === "";
      if (aNull && bNull) return 0;
      if (aNull) return 1;
      if (bNull) return -1;
      if (sort.key === "name" || sort.key === "cat") {
        const cmp = String(av).localeCompare(String(bv));
        return sort.dir === "asc" ? cmp : -cmp;
      }
      const cmp = Number(av) - Number(bv);
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return filtered.slice(0, 150);
  }, [funds, search, cat, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
  }

  return (
    <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
      <h3 className="mb-3 font-heading text-base font-semibold text-(--paper)">
        Buscador de Fondos <span className="text-[11px] font-normal text-(--muted)">({funds.length} en la watchlist)</span>
      </h3>
      <div className="mb-3.5 flex flex-wrap gap-2">
        <input type="text" placeholder="Buscar por nombre o ISIN…" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
        <select value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="text-(--muted)">
              <th className="cursor-pointer text-left select-none" onClick={() => toggleSort("name")}>
                Fondo{sort.key === "name" ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
              </th>
              <th className="cursor-pointer text-left select-none" onClick={() => toggleSort("cat")}>
                Categoría{sort.key === "cat" ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
              </th>
              <Th label="Rating" sortKey="rt" sort={sort} onSort={toggleSort} />
              <Th label="YTD" sortKey="ytd" sort={sort} onSort={toggleSort} />
              <Th label="1a" sortKey="y1" sort={sort} onSort={toggleSort} />
              <Th label="3a" sortKey="y3" sort={sort} onSort={toggleSort} />
              <Th label="5a" sortKey="y5" sort={sort} onSort={toggleSort} />
              <Th label="Sharpe 3a" sortKey="sh3" sort={sort} onSort={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => (
              <tr key={f.isin} className="cursor-pointer border-t border-(--line)" onClick={() => setSelected(f)}>
                <td className="py-1.5 text-(--paper)">{f.name}</td>
                <td className="text-(--muted)">{f.cat ?? "—"}</td>
                <td className="text-right font-mono text-(--brass)">{starRating(f.rt)}</td>
                <td className={`text-right font-mono ${pctClass(f.ytd) === "pos" ? "text-(--teal)" : pctClass(f.ytd) === "neg" ? "text-(--brick)" : "text-(--paper-dim)"}`}>{fmtPct(f.ytd)}</td>
                <td className="text-right font-mono text-(--paper-dim)">{fmtPct(f.y1)}</td>
                <td className="text-right font-mono text-(--paper-dim)">{fmtPct(f.y3)}</td>
                <td className="text-right font-mono text-(--paper-dim)">{fmtPct(f.y5)}</td>
                <td className="text-right font-mono text-(--paper-dim)">{f.sh3 != null ? f.sh3.toFixed(2) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="p-8 text-center text-[13px] text-(--muted)">No hay fondos que coincidan.</div>}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-[2100] flex items-center justify-center p-5"
          style={{ background: "rgba(19,31,56,0.65)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-[10px] p-5.5" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="m-0 font-heading text-base font-semibold text-(--paper)">{selected.name}</h3>
              <button type="button" className="secondary px-2.5 py-1 text-[11px]" onClick={() => setSelected(null)}>
                Cerrar
              </button>
            </div>
            <div className="mb-3 font-mono text-[11px] text-(--muted)">
              ISIN {selected.isin} · {selected.cat ?? "—"}
            </div>
            <FundIndexLine {...buildFundIndexSeries(selected)} />
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Kpi label="YTD" value={fmtPct(selected.ytd)} cls={pctClass(selected.ytd)} />
              <Kpi label="1 año" value={fmtPct(selected.y1)} cls={pctClass(selected.y1)} />
              <Kpi label="3 años" value={fmtPct(selected.y3)} cls={pctClass(selected.y3)} />
              <Kpi label="5 años" value={fmtPct(selected.y5)} cls={pctClass(selected.y5)} />
            </div>
            <div className="mt-3 text-[12px] text-(--muted)">
              Riesgo (desvío estándar de retornos anuales): {(() => {
                const r = computeFundRisk(selected);
                return r != null ? r.toFixed(2) + "%" : "—";
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, cls }: { label: string; value: string; cls?: string }) {
  const color = cls === "pos" ? "var(--teal)" : cls === "neg" ? "var(--brick)" : "var(--paper)";
  return (
    <div className="rounded-[10px] border border-(--line) bg-(--panel-2) px-3.5 py-3">
      <div className="mb-1 text-[10.5px] tracking-[0.6px] text-(--muted) uppercase">{label}</div>
      <div className="font-mono text-base font-semibold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
