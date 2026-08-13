import { isAnthropicConfigured, callClaude } from "./anthropic";

export interface RecommendationsResult {
  fecha: string;
  resumenMercado: string;
  cambiar: Array<{ activo: string; cuenta: string; situacion: string; accion: string; destino: string }>;
  mantenerConCondicion: Array<{ activo: string; cuenta: string; razon: string; condicion: string }>;
  estructurales: Array<{ tema: string; accion: string }>;
}

const INSTRUCTIONS_PREFIX =
  "Eres un asesor financiero senior. Con esta cartera consolidada, generá recomendaciones concretas activo por " +
  "activo (qué vender/recortar y hacia qué reasignarlo, qué mantener con condiciones, cambios estructurales). " +
  "Priorizá posiciones marcadas con pérdida significativa y concentraciones relevantes. Respondé en TEXTO PLANO " +
  "con el formato: FECHA: YYYY-MM-DD / RESUMEN: texto / CAMBIAR seguido de filas 'activo|cuenta|situacion|accion|destino' " +
  "/ MANTENER seguido de filas 'activo|cuenta|razon|condicion' / ESTRUCTURAL seguido de filas 'tema|accion'.\n\n";

function mockRecommendations(): RecommendationsResult {
  return {
    fecha: new Date().toISOString().slice(0, 10),
    resumenMercado: "Ejemplo ilustrativo — conectá ANTHROPIC_API_KEY para un análisis real de mercado y de la cartera.",
    cambiar: [
      {
        activo: "Fondo concentrado de ejemplo",
        cuenta: "Cuenta principal",
        situacion: "Concentración > 12% de la cartera",
        accion: "Recortar un 30%",
        destino: "Diversificar hacia renta fija global",
      },
    ],
    mantenerConCondicion: [
      { activo: "Fondo balanceado de ejemplo", cuenta: "Cuenta principal", razon: "Alineado al perfil", condicion: "Revisar en 6 meses" },
    ],
    estructurales: [{ tema: "Perfil de riesgo declarado", accion: "Confirmar cuestionario de idoneidad" }],
  };
}

function parseRecommendationsText(text: string): RecommendationsResult {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length);
  let fecha: string | null = null;
  let resumen = "";
  const cambiar: RecommendationsResult["cambiar"] = [];
  const mantener: RecommendationsResult["mantenerConCondicion"] = [];
  const estructural: RecommendationsResult["estructurales"] = [];
  let section: "cambiar" | "mantener" | "estructural" | null = null;

  for (const line of lines) {
    const clean = line.replace(/^[-*•\d.)\s]+/, "");
    if (/^FECHA\s*:/i.test(clean)) {
      fecha = clean.split(":").slice(1).join(":").trim();
      continue;
    }
    if (/^RESUMEN\s*:/i.test(clean)) {
      resumen = clean.split(":").slice(1).join(":").trim();
      continue;
    }
    if (/^CAMBIAR/i.test(clean)) {
      section = "cambiar";
      continue;
    }
    if (/^MANTENER/i.test(clean)) {
      section = "mantener";
      continue;
    }
    if (/^ESTRUCTURAL/i.test(clean)) {
      section = "estructural";
      continue;
    }
    if (!clean.includes("|")) continue;
    const cols = clean.split("|").map((c) => c.replace(/\*/g, "").trim());
    if (/^(activo|tema)$/i.test(cols[0])) continue;
    if (section === "cambiar" && cols.length >= 5) {
      cambiar.push({ activo: cols[0], cuenta: cols[1], situacion: cols[2], accion: cols[3], destino: cols[4] });
    } else if (section === "mantener" && cols.length >= 4) {
      mantener.push({ activo: cols[0], cuenta: cols[1], razon: cols[2], condicion: cols[3] });
    } else if (section === "estructural" && cols.length >= 2) {
      estructural.push({ tema: cols[0], accion: cols[1] });
    }
  }

  return {
    fecha: fecha || new Date().toISOString().slice(0, 10),
    resumenMercado: resumen || "Sin resumen disponible.",
    cambiar,
    mantenerConCondicion: mantener,
    estructurales: estructural,
  };
}

export async function getRecommendations(portfolioSummary: string): Promise<RecommendationsResult> {
  if (!isAnthropicConfigured()) return mockRecommendations();
  const text = await callClaude([{ role: "user", content: INSTRUCTIONS_PREFIX + portfolioSummary }], {
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    temperature: 0.2,
    maxTokens: 900,
  });
  return parseRecommendationsText(text);
}
