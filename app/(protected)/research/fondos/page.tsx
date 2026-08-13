import { createClient } from "@/lib/supabase/server";
import { getFunds } from "@/lib/queries/reference";
import { FundSearchTable } from "@/components/research/fund-search-table";

export default async function FondosPage() {
  const supabase = await createClient();
  const funds = await getFunds(supabase);
  return <FundSearchTable funds={funds} />;
}
