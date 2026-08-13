"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ASSET_TYPES } from "@/lib/constants";

export async function saveAdvisorMetrics(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const num = (key: string) => {
    const raw = formData.get(key);
    if (raw === null || raw === "") return null;
    const n = Number(raw);
    return isNaN(n) ? null : n;
  };
  const aum = Object.fromEntries(ASSET_TYPES.map((t) => [t, num(`aum_${t}`) ?? 0]));

  const { error } = await supabase.from("advisor_metrics").upsert({
    advisor_id: user.id,
    aum,
    aum_inicio_ano: num("aumInicioAno"),
    comisiones_q: num("comisionesQ"),
    entradas_nuevos_clientes: num("entradasNuevosClientes"),
    entradas_clientes_existentes: num("entradasClientesExistentes"),
    salidas: num("salidas"),
    n_clientes: num("nClientes"),
  });
  if (error) throw error;
  revalidatePath("/oficina");
}
