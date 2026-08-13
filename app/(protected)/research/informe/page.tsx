import { createClient } from "@/lib/supabase/server";
import { getDailyReports } from "@/lib/queries/daily-reports";
import { DailyReports } from "@/components/research/daily-reports";

export default async function InformePage() {
  const supabase = await createClient();
  const reports = await getDailyReports(supabase);
  return <DailyReports reports={reports} />;
}
