import { NextResponse } from "next/server";
import { isAnthropicConfigured, callClaude, parseJsonLoose, type AnthropicContentBlock } from "@/lib/ai/anthropic";

const EXTRACTION_SCHEMA_INSTRUCTIONS =
  "Eres un motor de extraccion y calculo financiero. Analiza el estado de cuenta adjunto y devuelve SOLO un JSON " +
  'compacto (sin markdown) con exactamente este esquema: {"custodioDetectado":"string","numeroCuenta":"string_or_null",' +
  '"mes":"AAAA-MM","moneda":"USD|ARS|BRL|CLP|COP|MXN|PEN|UYU","valorActual":number,"valorInicial":number,"flujosNetos":number,"valorActivos":number_or_null,' +
  '"valorPasivos":number_or_null,"flujosNetosYTD":number,"costosMes":number_or_null,"rentMTD":number_or_null,' +
  '"rentMTDMetodo":"informado"|"estimado","rentYTD":number_or_null,"rentYTDMetodo":"informado"|"estimado",' +
  '"asignacion":[{"tipo":"Efectivo|Renta Fija|Renta Variable|Fondos Mutuos|Alternativos|Otros","valor":number}],' +
  '"holdings":[{"nombre":"string","valor":number,"retornoPct":number_or_null}],"highlights":["string"],"movimientos":["string"]}. ' +
  "valorActual y valorInicial son SIEMPRE el patrimonio neto (activos menos pasivos), en la moneda del estado de cuenta " +
  '("moneda" es la moneda en la que estan expresados esos montos, USD si no se indica otra cosa). flujosNetos/flujosNetosYTD son ' +
  "SOLO transferencias externas del cliente, nunca compraventa de valores ni dividendos. Numeros JSON validos, sin comas de miles.";

const MOCK_CURRENCIES = ["USD", "USD", "USD", "ARS", "BRL", "CLP", "COP", "MXN"] as const;

/** Deterministic (not random) mock so repeated calls with the same input are stable. */
function mockExtraction(accountLabel: string | null, month: string | null, fileName: string) {
  let seed = 0;
  for (const ch of fileName + (accountLabel ?? "") + (month ?? "")) seed = (seed * 31 + ch.charCodeAt(0)) % 100000;
  const base = 400000 + (seed % 600000);
  const flujos = seed % 7 === 0 ? 10000 : 0;
  const moneda = MOCK_CURRENCIES[seed % MOCK_CURRENCIES.length];
  return {
    custodioDetectado: accountLabel ?? "Custodio de ejemplo",
    numeroCuenta: null,
    mes: month ?? new Date().toISOString().slice(0, 7),
    moneda,
    valorActual: base,
    valorInicial: Math.round(base * 0.98),
    flujosNetos: flujos,
    valorActivos: base,
    valorPasivos: 0,
    flujosNetosYTD: flujos * 3,
    costosMes: Math.round(base * 0.0008),
    rentMTD: null,
    rentMTDMetodo: "estimado",
    rentYTD: null,
    rentYTDMetodo: "estimado",
    asignacion: [
      { tipo: "Renta Variable", valor: Math.round(base * 0.45) },
      { tipo: "Renta Fija", valor: Math.round(base * 0.35) },
      { tipo: "Efectivo", valor: Math.round(base * 0.1) },
      { tipo: "Alternativos", valor: Math.round(base * 0.1) },
    ],
    holdings: [
      { nombre: "Fondo de ejemplo Global Equity", valor: Math.round(base * 0.25), retornoPct: 8.2 },
      { nombre: "Fondo de ejemplo Fixed Income", valor: Math.round(base * 0.2), retornoPct: 2.1 },
    ],
    highlights: ["Datos de ejemplo — conectá ANTHROPIC_API_KEY para extracción real."],
    movimientos: [],
    _mock: true,
  };
}

export async function POST(req: Request) {
  const body = await req.json();
  const { accountLabel, month, fileName, fileBase64, mediaType } = body as {
    accountLabel: string | null;
    month: string | null;
    fileName: string;
    fileBase64?: string;
    mediaType?: string;
  };

  if (!isAnthropicConfigured()) {
    return NextResponse.json(mockExtraction(accountLabel, month, fileName));
  }

  const docBlock: AnthropicContentBlock =
    fileBase64 && mediaType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: fileBase64 } }
      : { type: "image", source: { type: "base64", media_type: mediaType ?? "image/png", data: fileBase64 ?? "" } };

  const accountPart = accountLabel ? `cuenta: ${accountLabel}. ` : "";
  const monthPart = month ? `El mes de este estado de cuenta es ${month}. ` : "";
  const text = await callClaude(
    [{ role: "user", content: [docBlock, { type: "text", text: accountPart + monthPart + EXTRACTION_SCHEMA_INSTRUCTIONS }] }],
    // The default 1000-token cap truncates mid-JSON for accounts with many holdings
    // (a full asignacion + holdings + highlights + movimientos array easily exceeds it),
    // which then fails to parse with a cryptic "Unexpected end of JSON input". Sonnet 5
    // supports up to 128k output tokens on the standard API, so 16000 costs nothing in
    // practice while removing the budget as a variable entirely.
    { maxTokens: 16000 },
  );
  const parsed = parseJsonLoose(text);
  return NextResponse.json(parsed);
}
