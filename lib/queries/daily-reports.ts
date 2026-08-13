import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export interface DailyReport {
  id: string;
  date: string;
  title: string | null;
  content: string | null;
  filePath: string | null;
  fileUrl: string | null;
  createdAt: string;
}

export async function getDailyReports(supabase: SupabaseClient<Database>): Promise<DailyReport[]> {
  const { data, error } = await supabase.from("daily_reports").select("*").order("date", { ascending: false });
  if (error) throw error;

  const reports: DailyReport[] = [];
  for (const r of data ?? []) {
    let fileUrl: string | null = null;
    if (r.file_path) {
      const { data: signed } = await supabase.storage.from("daily-reports").createSignedUrl(r.file_path, 3600);
      fileUrl = signed?.signedUrl ?? null;
    }
    reports.push({ id: r.id, date: r.date, title: r.title, content: r.content, filePath: r.file_path, fileUrl, createdAt: r.created_at });
  }
  return reports;
}
