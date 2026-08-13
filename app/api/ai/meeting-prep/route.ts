import { NextResponse } from "next/server";
import { isAnthropicConfigured, callClaude } from "@/lib/ai/anthropic";

export async function POST(req: Request) {
  const { portfolioContext } = (await req.json()) as { portfolioContext: string };

  if (!isAnthropicConfigured()) {
    return NextResponse.json({
      text:
        "Ejemplo ilustrativo de preparación de reunión — conectá ANTHROPIC_API_KEY para un resumen real.\n\n" +
        "1) Estado de la cartera: ejemplo de datos.\n2) Highlights: ejemplo.\n3) Pendientes: revisar tareas del cliente.\n4) Contexto de mercado: no disponible en modo demo.",
      _mock: true,
    });
  }

  const instructions =
    "Actuás como asesor financiero preparando una reunión con un cliente. Con este contexto de cartera, generá un " +
    "resumen de 1 página con: 1) estado de la cartera (MTD/YTD por cuenta), 2) highlights y puntos de atención, " +
    "3) tareas pendientes relevantes para la reunión, 4) contexto breve de mercado (buscá en la web si hace falta).\n\n" +
    portfolioContext;
  const text = await callClaude([{ role: "user", content: instructions }], {
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    temperature: 0.3,
    maxTokens: 900,
  });
  return NextResponse.json({ text });
}
