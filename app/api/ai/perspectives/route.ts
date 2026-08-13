import { NextResponse } from "next/server";
import { isAnthropicConfigured, callClaude, parseJsonLoose } from "@/lib/ai/anthropic";

export async function POST(req: Request) {
  const { contextSummary } = (await req.json()) as { contextSummary: string };

  if (!isAnthropicConfigured()) {
    return NextResponse.json({
      fecha: new Date().toISOString().slice(0, 10),
      resumen: "Ejemplo ilustrativo — conectá ANTHROPIC_API_KEY para perspectivas de mercado reales.",
      sugerencias: [
        "Diversificar concentraciones por encima del 10% del patrimonio.",
        "Revisar duración de renta fija ante cambios de tasas.",
        "Confirmar que la asignación siga el perfil de riesgo declarado.",
        "Evaluar exposición a mercados emergentes.",
      ],
      _mock: true,
    });
  }

  const instructions =
    "Buscá perspectivas de mercado recientes de bancos y gestoras globales relevantes sobre renta variable, renta " +
    `fija y mercados emergentes. Considerando esta cartera: ${contextSummary}. Respondé SOLO JSON compacto: ` +
    '{"fecha":"YYYY-MM-DD","resumen":"string","sugerencias":["string","string","string","string"]}.';
  const text = await callClaude([{ role: "user", content: instructions }], {
    tools: [{ type: "web_search_20250305", name: "web_search" }],
  });
  return NextResponse.json(parseJsonLoose(text));
}
