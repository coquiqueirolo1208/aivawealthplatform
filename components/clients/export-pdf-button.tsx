"use client";

import { useState } from "react";
import type { ConsolidadoPdfData } from "@/lib/pdf/export-consolidado";

export function ExportPdfButton({ data }: { data: ConsolidadoPdfData }) {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      className="secondary"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const { exportConsolidadoToPdf } = await import("@/lib/pdf/export-consolidado");
          await exportConsolidadoToPdf(data);
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Generando PDF…" : "Exportar a PDF"}
    </button>
  );
}
