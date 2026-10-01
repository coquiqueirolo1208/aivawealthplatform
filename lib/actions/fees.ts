"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";

type ActionResult = { error: string | null };

/** Parses "1", "1.25" or "1,25"; empty means "not set". */
function parseNumber(raw: FormDataEntryValue | null): number | null | "invalid" {
  const s = String(raw ?? "").trim().replace(/\s/g, "").replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : "invalid";
}

function revalidateFees(clientId?: string) {
  revalidatePath("/oficina/honorarios");
  revalidatePath("/oficina");
  if (clientId) revalidatePath(`/clientes/${clientId}`, "layout");
}

export async function updateClientFee(clientId: string, formData: FormData): Promise<ActionResult> {
  const pct = parseNumber(formData.get("feePct"));
  const min = parseNumber(formData.get("feeMinAnnual"));
  if (pct === "invalid" || (pct != null && pct > 10)) return { error: "El % anual tiene que ser un número entre 0 y 10." };
  if (min === "invalid") return { error: "El mínimo anual tiene que ser un número positivo." };
  const { supabase } = await requireUser();
  const { error } = await supabase.from("clients").update({ fee_pct: pct, fee_min_annual: min }).eq("id", clientId);
  if (error) return { error: "No se pudo guardar el honorario." };
  revalidateFees(clientId);
  return { error: null };
}

export async function markFeeInvoiced(
  clientId: string,
  period: string,
  baseAum: number | null,
  feePct: number | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!/^\d{4}-Q[1-4]$/.test(period)) return { error: "Trimestre inválido." };
  const amount = parseNumber(formData.get("amount"));
  if (amount == null || amount === "invalid") return { error: "Ingresá el monto facturado." };
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("fee_records")
    .upsert(
      { client_id: clientId, period, amount, base_aum: baseAum, fee_pct: feePct, status: "facturado", invoiced_at: new Date().toISOString(), paid_at: null },
      { onConflict: "client_id,period" },
    );
  if (error) return { error: "No se pudo registrar la factura." };
  revalidateFees(clientId);
  return { error: null };
}

export async function markFeePaid(recordId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("fee_records").update({ status: "cobrado", paid_at: new Date().toISOString() }).eq("id", recordId);
  if (error) return { error: "No se pudo marcar como cobrado." };
  revalidateFees();
  return { error: null };
}

/** Steps a record back: cobrado -> facturado, facturado -> pending (record removed). */
export async function undoFeeStatus(recordId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { data: rec, error: readError } = await supabase.from("fee_records").select("status").eq("id", recordId).maybeSingle();
  if (readError || !rec) return { error: "No se encontró el registro." };
  const { error } =
    rec.status === "cobrado"
      ? await supabase.from("fee_records").update({ status: "facturado", paid_at: null }).eq("id", recordId)
      : await supabase.from("fee_records").delete().eq("id", recordId);
  if (error) return { error: "No se pudo deshacer." };
  revalidateFees();
  return { error: null };
}
