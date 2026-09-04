// Thin wrapper around the Anthropic Messages API, matching the original app's
// callClaude() (which worked only inside a Claude.ai artifact, with no API key
// needed there). Here it's server-only and requires ANTHROPIC_API_KEY.
// Every /api/ai/* route checks isAnthropicConfigured() first and returns a
// clearly-labeled mock when it's false, so the rest of the app never has to care
// which mode it's in until a real key is set.

export function isAnthropicConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export interface AnthropicContentBlock {
  type: "text" | "document" | "image";
  text?: string;
  source?: { type: "base64"; media_type: string; data: string };
}

export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

export async function callClaude(
  messages: AnthropicMessage[],
  opts: { tools?: unknown[]; temperature?: number; maxTokens?: number } = {},
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: opts.maxTokens ?? 1000,
      messages,
      ...(opts.tools ? { tools: opts.tools } : {}),
      ...(typeof opts.temperature === "number" ? { temperature: opts.temperature } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = body?.error?.message ? `: ${body.error.message}` : "";
    throw new Error(`Anthropic API error (${res.status})${detail}`);
  }
  const data = await res.json();
  return (data.content ?? []).map((b: { type: string; text?: string }) => (b.type === "text" ? b.text : "")).join("\n");
}

/** Same loose-JSON recovery as the original app's parseJsonLoose, for when the model doesn't return strict JSON. */
export function parseJsonLoose(text: string): unknown {
  let t = text.trim();
  t = t
    .replace(/^```json/i, "")
    .replace(/^```/, "")
    .replace(/```\s*$/, "")
    .trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) t = t.substring(start, end + 1);
  t = t.replace(/:(\s*)(-?\d{1,3}(?:,\d{3})+(?:\.\d+)?)/g, (_m, ws, num) => ":" + ws + num.replace(/,/g, ""));
  const fixes: Array<(s: string) => string> = [
    (x) => x,
    (x) => x.replace(/,(\s*[}\]])/g, "$1"),
    (x) => x.replace(/[“”]/g, '"').replace(/[‘’]/g, "'"),
  ];
  let lastErr: unknown;
  for (const fix of fixes) {
    try {
      return JSON.parse(fix(t));
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}
