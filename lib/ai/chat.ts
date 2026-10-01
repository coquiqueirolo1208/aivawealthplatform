import { isAnthropicConfigured, callClaude } from "./anthropic";

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

/** Turns kept from the conversation — enough for follow-ups ("¿y el segundo?") without the cost growing unbounded. */
const MAX_TURNS = 12;

export async function getChatReply(history: ChatTurn[], context: string): Promise<string> {
  const turns = history.slice(-MAX_TURNS);
  // The API requires the conversation to open with a user turn.
  while (turns.length && turns[0].role !== "user") turns.shift();
  const question = turns.at(-1)?.text ?? "";
  if (!isAnthropicConfigured()) {
    return `Modo demo (IA no conectada): recibí tu pregunta "${question}". Cuando conectemos ANTHROPIC_API_KEY, el IA Advisor va a poder responder usando research real y la cartera de tus clientes.`;
  }
  const system =
    "Sos el IA Advisor de una plataforma de wealth management. Respondé en español, de forma concisa, las " +
    "preguntas del asesor. Para datos de sus clientes usá SOLO el contexto provisto — si no encontrás el dato, " +
    "decilo explícitamente en vez de inventarlo, y no inventes clientes que no estén en el contexto. Para mercados " +
    "o fondos podés buscar en la web. No es asesoramiento financiero formal.\n\n" +
    `Contexto (cartera de los clientes del asesor):\n${context}`;
  return callClaude(
    turns.map((t) => ({ role: t.role, content: t.text })),
    { system, tools: [{ type: "web_search_20250305", name: "web_search" }], temperature: 0.3, maxTokens: 1200 },
  );
}
