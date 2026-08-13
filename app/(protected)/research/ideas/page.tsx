import { createClient } from "@/lib/supabase/server";
import { getIdeasBonds, getIdeasEtfs, getIdeasFunds, getIdeasStocks } from "@/lib/queries/ideas";
import { IdeasPanel } from "@/components/research/ideas-panel";

export default async function IdeasPage() {
  const supabase = await createClient();
  const [fondos, etfs, bonos, acciones] = await Promise.all([
    getIdeasFunds(supabase),
    getIdeasEtfs(supabase),
    getIdeasBonds(supabase),
    getIdeasStocks(supabase),
  ]);
  return <IdeasPanel data={{ fondos, etfs, bonos, acciones }} />;
}
