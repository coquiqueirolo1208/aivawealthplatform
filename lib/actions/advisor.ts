"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
};
const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB

export async function uploadAdvisorLogo(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const file = formData.get("logo") as File | null;
  if (!file || !file.size) return;
  const ext = ALLOWED_TYPES[file.type];
  if (!ext || file.size > MAX_LOGO_BYTES) return;

  const path = `${user.id}/logo.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("advisor-logos")
    .upload(path, file, { contentType: file.type, upsert: true });
  if (uploadError) throw uploadError;

  const { error } = await supabase.from("advisors").update({ logo_path: path }).eq("id", user.id);
  if (error) throw error;
  revalidatePath("/oficina");
}

export async function removeAdvisorLogo() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: advisor } = await supabase.from("advisors").select("logo_path").eq("id", user.id).maybeSingle();
  if (advisor?.logo_path) {
    await supabase.storage.from("advisor-logos").remove([advisor.logo_path]);
  }
  const { error } = await supabase.from("advisors").update({ logo_path: null }).eq("id", user.id);
  if (error) throw error;
  revalidatePath("/oficina");
}
