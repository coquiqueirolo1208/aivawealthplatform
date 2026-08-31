"use client";

import { useState } from "react";
import type { Prospect } from "@/lib/queries/prospects";

export function ExportExcelButton({
  prospects,
  filename,
  className,
}: {
  prospects: Prospect[];
  filename: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      className={className ?? "secondary px-2.5 py-1.5 text-[12px]"}
      disabled={busy || prospects.length === 0}
      onClick={async () => {
        setBusy(true);
        try {
          const { exportProspectsToExcel } = await import("@/lib/xlsx/export-prospects");
          await exportProspectsToExcel(prospects, filename);
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Generando…" : "Exportar a Excel"}
    </button>
  );
}
