import { createClient } from "@/lib/supabase/server";
import { getFunds } from "@/lib/queries/reference";
import { getInvestecClasses, getInvestecDataBlob, getInvestecSolutions } from "@/lib/queries/investec";
import { InvestecSolutions } from "@/components/research/investec-solutions";

export default async function SolucionesPage() {
  const supabase = await createClient();
  const [solutions, classes, investecData, fondosDb] = await Promise.all([
    getInvestecSolutions(supabase),
    getInvestecClasses(supabase),
    getInvestecDataBlob(supabase),
    getFunds(supabase),
  ]);
  return <InvestecSolutions solutions={solutions} classes={classes} investecData={investecData} fondosDb={fondosDb} />;
}
