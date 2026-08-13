"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveBenchmarkLevel(formData: FormData) {
  const month = String(formData.get("month") ?? "");
  if (!/^\d{4}-\d{2}$/.test(month)) return;
  const msci = formData.get("msci") ? Number(formData.get("msci")) : null;
  const agg = formData.get("agg") ? Number(formData.get("agg")) : null;

  const supabase = await createClient();
  const { error } = await supabase.from("benchmark_levels").upsert({ month, msci, agg });
  if (error) throw error;
  revalidatePath("/clientes", "layout");
}

export async function deleteBenchmarkLevel(month: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("benchmark_levels").delete().eq("month", month);
  if (error) throw error;
  revalidatePath("/clientes", "layout");
}
