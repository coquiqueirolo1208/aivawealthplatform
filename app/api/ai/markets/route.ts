import { NextResponse } from "next/server";
import { isAnthropicConfigured, callClaude } from "@/lib/ai/anthropic";

function mockMarkets() {
  return {
    fecha: new Date().toISOString().slice(0, 10),
    noticias: [{ titulo: "Modo demo — conectá ANTHROPIC_API_KEY para noticias reales", fuente: "—", hora: "" }],
    curva: [
      { plazo: "1M", yield: 4.3 },
      { plazo: "2Y", yield: 3.9 },
      { plazo: "10Y", yield: 4.1 },
      { plazo: "30Y", yield: 4.4 },
    ],
    acciones: [{ nombre: "S&P 500", precio: 5800, cambio: 0.4 }],
    commodities: [{ nombre: "Oro", precio: 2400, cambio: 0.2 }],
    bonos: [{ nombre: "UST 10Y", precio: 98.5, cambio: -0.1 }],
    monedas: [{ nombre: "DXY", precio: 103.2, cambio: 0.05 }],
    raw: "",
    _mock: true,
  };
}

export async function POST() {
  if (!isAnthropicConfigured()) return NextResponse.json(mockMarkets());

  const instructions =
    "Buscá en la web: 8 titulares financieros relevantes de hoy, la curva de rendimientos del Tesoro de EE.UU. " +
    "(1M a 30Y), niveles de S&P500/NASDAQ100/VIX, commodities clave (oro, plata, cobre, WTI, Brent, soja), " +
    "rendimientos de bonos del Tesoro a 2/10/30 años y precio de TLT, y FX (DXY, EUR/USD, USD/JPY, USD/BRL, USD/MXN). " +
    "Respondé en texto plano con secciones FECHA/NOTICIAS/CURVA/ACCIONES/COMMODITIES/BONOS/MONEDAS, columnas separadas por '|'.";
  const text = await callClaude([{ role: "user", content: instructions }], {
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    temperature: 0.2,
    maxTokens: 1800,
  });
  // Parsing this pipe-delimited format is done client-side (parseMarketsText, ported in task 7)
  // so the route just returns the raw text alongside a best-effort empty shape for now.
  return NextResponse.json({ ...mockMarkets(), raw: text, _mock: false });
}
