"use client";

import { useEffect, useState } from "react";
import "@/lib/chart-setup";
import { Line } from "react-chartjs-2";

interface MarketRow {
  nombre: string;
  precio: number;
  cambio: number;
}
interface MarketsData {
  fecha: string;
  noticias: Array<{ titulo: string; fuente: string; hora: string }>;
  curva: Array<{ plazo: string; yield: number }>;
  acciones: MarketRow[];
  commodities: MarketRow[];
  bonos: MarketRow[];
  monedas: MarketRow[];
  raw: string;
  _mock?: boolean;
}

function MiniTable({ title, rows }: { title: string; rows: MarketRow[] }) {
  return (
    <div>
      <h4 className="mb-1.5 text-[11.5px] font-semibold text-(--paper)">{title}</h4>
      <table className="w-full text-[11.5px]">
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-(--line)">
              <td className="py-1 text-(--paper-dim)">{r.nombre}</td>
              <td className="text-right font-mono text-(--paper-dim)">{r.precio}</td>
              <td className="text-right font-mono" style={{ color: r.cambio >= 0 ? "var(--teal)" : "var(--brick)" }}>
                {r.cambio >= 0 ? "+" : ""}
                {r.cambio}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MarketsPanel() {
  const [data, setData] = useState<MarketsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRaw, setShowRaw] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/ai/markets", { method: "POST" });
    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  useEffect(() => {
    // Fetch-on-mount: the mocked/real AI market data isn't available at render time.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  return (
    <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="m-0 font-heading text-base font-semibold text-(--paper)">Mercados</h3>
        <button type="button" className="secondary px-2.5 py-1.5 text-[12px]" disabled={loading} onClick={load}>
          {loading ? "Actualizando…" : "Actualizar ahora"}
        </button>
      </div>

      {data?._mock && (
        <div className="mb-3 rounded-lg px-3.5 py-2 text-[11.5px]" style={{ background: "var(--panel-2)", border: "1px solid var(--brass)", color: "var(--brass)" }}>
          Modo demo IA — conectá ANTHROPIC_API_KEY para datos de mercado reales y actualizados.
        </div>
      )}

      {!data ? (
        <div className="p-8 text-center text-[13px] text-(--muted)">Cargando…</div>
      ) : (
        <>
          <div className="mb-4 rounded-lg p-3.5" style={{ background: "var(--panel-2)" }}>
            <h4 className="mb-2 text-[11.5px] font-semibold text-(--paper)">Titulares — {data.fecha}</h4>
            {data.noticias.map((n, i) => (
              <div key={i} className="mb-1 text-[12px] text-(--paper-dim)">
                {n.titulo} <span className="text-(--muted)">({n.fuente})</span>
              </div>
            ))}
          </div>

          <div className="mb-4">
            <h4 className="mb-2 text-[11.5px] font-semibold text-(--paper)">Curva de rendimientos (Tesoro EE.UU.)</h4>
            <div className="relative h-[180px]">
              <Line
                data={{ labels: data.curva.map((c) => c.plazo), datasets: [{ data: data.curva.map((c) => c.yield), borderColor: "#28466F", tension: 0.3 }] }}
                options={{ plugins: { legend: { display: false } }, maintainAspectRatio: false }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <MiniTable title="Índices" rows={data.acciones} />
            <MiniTable title="Commodities" rows={data.commodities} />
            <MiniTable title="Bonos" rows={data.bonos} />
            <MiniTable title="Monedas" rows={data.monedas} />
          </div>

          <button type="button" className="secondary mt-3 px-2.5 py-1 text-[11px]" onClick={() => setShowRaw((s) => !s)}>
            {showRaw ? "Ocultar respuesta cruda" : "Ver respuesta cruda"}
          </button>
          {showRaw && <pre className="mt-2 max-h-60 overflow-auto rounded-lg p-3 text-[11px] whitespace-pre-wrap text-(--muted)" style={{ background: "var(--panel-2)" }}>{data.raw || "(vacío en modo demo)"}</pre>}
        </>
      )}
    </div>
  );
}
