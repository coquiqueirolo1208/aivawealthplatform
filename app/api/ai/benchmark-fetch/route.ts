import { NextResponse } from "next/server";
import { isAnthropicConfigured, callClaude } from "@/lib/ai/anthropic";

function findValue(text: string, key: string): number | null {
  const m = new RegExp(key + "\\s*:\\s*(-?[\\d.]+)", "i").exec(text);
  return m ? parseFloat(m[1]) : null;
}

export async function POST() {
  if (!isAnthropicConfigured()) {
    return NextResponse.json({
      fecha: new Date().toISOString().slice(0, 10),
      msciMTD: 1.2,
      msciYTD: 9.5,
      aggMTD: -0.3,
      aggYTD: 2.1,
      blendMTD: 0.7 * 1.2 + 0.3 * -0.3,
      blendYTD: 0.7 * 9.5 + 0.3 * 2.1,
      raw: "Modo demo — conectá ANTHROPIC_API_KEY para buscar los valores reales.",
      _mock: true,
    });
  }

  const instructions =
    "Necesito el retorno MTD y YTD actual, en USD, de MSCI World (proxy ETF URTH/ACWI) y Bloomberg Global-Aggregate " +
    "Unhedged USD (proxy LEGATRUU o ETF AGGG/GLAG). Respondé SOLO líneas de texto plano: " +
    "MSCI_WORLD_MTD: X.XX\nMSCI_WORLD_YTD: X.XX\nAGG_MTD: X.XX\nAGG_YTD: X.XX";
  const text = await callClaude([{ role: "user", content: instructions }], {
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    temperature: 0.1,
  });
  const msciMTD = findValue(text, "MSCI_WORLD_MTD");
  const msciYTD = findValue(text, "MSCI_WORLD_YTD");
  const aggMTD = findValue(text, "AGG_MTD");
  const aggYTD = findValue(text, "AGG_YTD");
  return NextResponse.json({
    fecha: new Date().toISOString().slice(0, 10),
    msciMTD,
    msciYTD,
    aggMTD,
    aggYTD,
    blendMTD: msciMTD != null && aggMTD != null ? 0.7 * msciMTD + 0.3 * aggMTD : null,
    blendYTD: msciYTD != null && aggYTD != null ? 0.7 * msciYTD + 0.3 * aggYTD : null,
    raw: text,
  });
}
