"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireAdvisorId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, advisorId: user.id };
}

export async function addClient(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const { supabase, advisorId } = await requireAdvisorId();
  const { data, error } = await supabase
    .from("clients")
    .insert({ advisor_id: advisorId, name })
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath("/clientes");
  redirect(`/clientes/${data.id}`);
}

/** FK cascade (ON DELETE CASCADE) takes care of accounts/snapshots/tasks/documents/etc. */
export async function deleteClient(clientId: string) {
  const { supabase } = await requireAdvisorId();
  const { error } = await supabase.from("clients").delete().eq("id", clientId);
  if (error) throw error;
  revalidatePath("/clientes");
}
