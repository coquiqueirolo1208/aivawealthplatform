// Ported from dashboard_patrimonial_13.html docStatusInfo (line ~3553).
export interface DocumentLike {
  estado: string;
  vencimiento: string | null;
}

export function docStatusInfo(d: DocumentLike): { label: "Pendiente" | "Vencido" | "Vigente" } {
  if (d.estado === "pendiente") return { label: "Pendiente" };
  const today = new Date().toISOString().slice(0, 10);
  if (d.vencimiento && d.vencimiento < today) return { label: "Vencido" };
  return { label: "Vigente" };
}
