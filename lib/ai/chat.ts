import { isAnthropicConfigured, callClaude } from "./anthropic";

export async function getChatReply(question: string, context: string): Promise<string> {
  if (!isAnthropicConfigured()) {
    return `Modo demo (IA no conectada): recibí tu pregunta "${question}". Cuando conectemos ANTHROPIC_API_KEY, el IA Advisor va a poder responder usando research real y la cartera de tus clientes.`;
  }
  const instructions =
    "Sos el IA Advisor de una plataforma de wealth management. Respondé la siguiente pregunta del asesor usando " +
    "SOLO la información de contexto provista (cartera de sus clientes) — si no encontrás el dato, decilo " +
    `explícitamente en vez de inventarlo. No inventes clientes que no estén en el contexto.\n\nContexto:\n${context}\n\nPregunta: ${question}`;
  return callClaude([{ role: "user", content: instructions }], {
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    temperature: 0.3,
    maxTokens: 900,
  });
}
