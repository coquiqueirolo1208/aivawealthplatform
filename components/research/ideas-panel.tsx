"use client";

import { useMemo, useState } from "react";
import { IDEAS_CONFIG, ideasFormatVal, ideasSortVal } from "@/lib/research/ideas-config";
import type { IdeaRow } from "@/lib/queries/ideas";

type AssetKey = keyof typeof IDEAS_CONFIG;
const ASSET_TABS: Array<[AssetKey, string]> = [
  ["fondos", "Fondos"],
  ["etfs", "ETFs"],
  ["bonos", "Bonos"],
  ["acciones", "Acciones"],
];

export function IdeasPanel({ data }: { data: Record<AssetKey, IdeaRow[]> }) {
  const [tab, setTab] = useState<AssetKey>("fondos");
  return (
    <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
      <h3 className="mb-3 font-heading text-base font-semibold text-(--paper)">
        Mejores Ideas <span className="text-[11px] font-normal text-(--muted)">selección curada AIVA por clase de activo</span>
      </h3>
      <div className="mb-3.5 flex flex-wrap gap-1.5">
        {ASSET_TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className="rounded-full px-3 py-1 text-[12px]"
            style={{
              background: tab === id ? "transparent" : "var(--panel-2)",
              border: `1px solid ${tab === id ? "var(--brass)" : "var(--line)"}`,
              color: tab === id ? "var(--brass)" : "var(--paper-dim)",
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <IdeasAssetTable assetKey={tab} rows={data[tab]} />
    </div>
  );
}

function IdeasAssetTable({ assetKey, rows }: { assetKey: AssetKey; rows: IdeaRow[] }) {
  const cfg = IDEAS_CONFIG[assetKey];
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("");
  const [sort, setSort] = useState(cfg.defaultSort);

  const sectors = useMemo(() => Array.from(new Set(rows.map((r) => r.sector as string).filter(Boolean))).sort(), [rows]);

  const filtered = useMemo(() => {
    const s = search.trim().toUpperCase();
    let out = rows.filter((r) => {
      if (sector && r.sector !== sector) return false;
      if (!s) return true;
      return cfg.searchFields.some((f) => String(r[f] ?? "").toUpperCase().includes(s));
    });
    const col = cfg.columns.find((c) => c.key === sort.key);
    const type = col?.type ?? "str";
    out = out.slice().sort((a, b) => {
      const av = ideasSortVal(a[sort.key], type);
      const bv = ideasSortVal(b[sort.key], type);
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return out.slice(0, 300);
  }, [rows, search, sector, sort, cfg]);

  function toggleSort(key: string) {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <input type="text" placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
        {sectors.length > 0 && (
          <select value={sector} onChange={(e) => setSector(e.target.value)}>
            <option value="">Todos los sectores</option>
            {sectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-(--muted)">
              {cfg.columns.map((c) => (
                <th
                  key={c.key}
                  className={`cursor-pointer select-none ${c.type === "str" ? "text-left" : "text-right"}`}
                  style={c.min ? { minWidth: c.min } : undefined}
                  onClick={() => toggleSort(c.key)}
                >
                  {c.label}
                  {sort.key === c.key ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i} className="border-t border-(--line)">
                {cfg.columns.map((c) => (
                  <td key={c.key} className={`py-1.5 ${c.type === "str" ? "text-(--paper)" : "text-right font-mono text-(--paper-dim)"}`}>
                    {ideasFormatVal(r[c.key], c.type)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="p-8 text-center text-[13px] text-(--muted)">No hay resultados.</div>}
      </div>
    </div>
  );
}
