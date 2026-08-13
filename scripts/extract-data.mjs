// One-off extraction of the static reference/demo datasets embedded as JS literals
// in dashboard_patrimonial_13.html (DEMO_DATA, FONDOS_DB, PM_DATA, INVESTEC_DATA,
// INVESTEC_SOLUTIONS, INVESTEC_CLASES, and the 4 "Mejores Ideas" arrays) into plain
// JSON files under supabase/seed-data/, so they can be transformed + inserted into
// Supabase without hand-transcribing ~600+ rows.
//
// Usage: node scripts/extract-data.mjs <path-to-dashboard_patrimonial_13.html>

import fs from "node:fs";
import path from "node:path";

const CONSTANTS = [
  "DEMO_DATA",
  "FONDOS_DB",
  "PM_DATA",
  "INVESTEC_DATA",
  "INVESTEC_SOLUTIONS",
  "INVESTEC_CLASES",
  "ACCIONES_IDEAS",
  "FONDOS_IDEAS_DB",
  "ETFS_IDEAS",
  "BONOS_IDEAS",
];

const srcPath = process.argv[2];
if (!srcPath) {
  console.error("Usage: node scripts/extract-data.mjs <path-to-dashboard_patrimonial_13.html>");
  process.exit(1);
}
const src = fs.readFileSync(srcPath, "utf8");

function extractLiteral(name) {
  const marker = `const ${name} = `;
  const start = src.indexOf(marker);
  if (start === -1) throw new Error(`Could not find "${marker}" in source`);
  const litStart = start + marker.length;
  const openChar = src[litStart];
  if (openChar !== "[" && openChar !== "{") {
    throw new Error(`Unexpected literal start for ${name}: ${JSON.stringify(openChar)}`);
  }
  const closeChar = openChar === "[" ? "]" : "}";
  let depth = 0;
  let inString = false;
  let stringChar = "";
  let i = litStart;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inString) {
      if (c === "\\") {
        i++; // skip escaped char
        continue;
      }
      if (c === stringChar) inString = false;
      continue;
    }
    if (c === '"' || c === "'") {
      inString = true;
      stringChar = c;
      continue;
    }
    if (c === openChar) depth++;
    else if (c === closeChar) {
      depth--;
      if (depth === 0) {
        i++; // include the closing bracket
        break;
      }
    }
  }
  const literal = src.slice(litStart, i);
  try {
    return JSON.parse(literal);
  } catch {
    // Some literals use JS object-literal syntax (unquoted keys) rather than
    // strict JSON. This is trusted local source, so evaluate it directly.
    return new Function(`"use strict"; return (${literal});`)();
  }
}

const outDir = path.resolve(import.meta.dirname, "../supabase/seed-data");
fs.mkdirSync(outDir, { recursive: true });

for (const name of CONSTANTS) {
  const data = extractLiteral(name);
  const outPath = path.join(outDir, `${name}.json`);
  fs.writeFileSync(outPath, JSON.stringify(data));
  const size = Array.isArray(data) ? `${data.length} rows` : `${Object.keys(data).length} keys`;
  console.log(`Wrote ${outPath} (${size})`);
}
