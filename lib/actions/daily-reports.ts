"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function publishDailyReport(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const date = String(formData.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  const title = String(formData.get("title") ?? "") || null;
  const content = String(formData.get("content") ?? "") || null;
  const file = formData.get("file") as File | null;

  if (!file?.size && !content) return; // need at least one of file or text content

  let filePath: string | null = null;
  if (file && file.size > 0) {
    filePath = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: uploadError } = await supabase.storage.from("daily-reports").upload(filePath, file, {
      contentType: file.type || "application/pdf",
    });
    if (uploadError) throw uploadError;
  }

  const { error } = await supabase.from("daily_reports").insert({
    date,
    title,
    content,
    file_path: filePath,
    created_by: user.id,
  });
  if (error) throw error;
  revalidatePath("/research/informe");
}
