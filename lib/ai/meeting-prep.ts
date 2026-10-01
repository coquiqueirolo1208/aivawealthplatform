import { isAnthropicConfigured, callClaude } from "./anthropic";

export async function getMeetingPrep(clientContext: string): Promise<string> {
  if (!isAnthropicConfigured()) {
    return (
      "Ejemplo ilustrativo de preparación de reunión — conectá ANTHROPIC_API_KEY para un resumen real.\n\n" +
      "1) Estado de la cartera: ejemplo de datos.\n2) Highlights: ejemplo.\n3) Pendientes: revisar tareas del cliente.\n" +
      "4) Contexto de mercado: no disponible en modo demo."
    );
  }
  const system =
    "Actuás como asesor financiero preparando una reunión con un cliente. Con el contexto provisto, generá un " +
    "resumen de 1 página en español, en texto plano (sin markdown ni tablas), con: 1) estado de la cartera, " +
    "2) highlights y puntos de atención (concentraciones, pérdidas relevantes, desvíos), 3) pendientes a tratar en la " +
    "reunión (tareas, documentos por vencer, temas de las notas), 4) contexto breve de mercado relevante para sus " +
    "posiciones (buscá en la web si hace falta), 5) 3 preguntas sugeridas para hacerle al cliente. Usá solo los datos " +
    "del contexto para lo que es del cliente; no inventes cifras.";
  return callClaude([{ role: "user", content: clientContext }], {
    system,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    temperature: 0.3,
    maxTokens: 1500,
  });
}
