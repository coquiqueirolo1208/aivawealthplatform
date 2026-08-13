import { createClient } from "@/lib/supabase/server";
import { getFunds } from "@/lib/queries/reference";
import { ComparativoFondos } from "@/components/research/comparativo-fondos";

export default async function ComparativoPage() {
  const supabase = await createClient();
  const funds = await getFunds(supabase);
  return <ComparativoFondos funds={funds} />;
}
