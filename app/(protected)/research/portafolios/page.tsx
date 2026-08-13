import { createClient } from "@/lib/supabase/server";
import { getFunds, getModelPortfolio } from "@/lib/queries/reference";
import { computePMTargetWeights, pmPortfolioMetricsFull } from "@/lib/finance";
import { ModelPortfolios, type ModelPortfolioView } from "@/components/research/model-portfolios";

const PROFILE_KEYS = ["conservador", "balanceado", "dinamico"] as const;

export default async function PortafoliosPage() {
  const supabase = await createClient();
  const fondosDb = await getFunds(supabase);

  const views: ModelPortfolioView[] = [];
  for (const key of PROFILE_KEYS) {
    const portfolio = await getModelPortfolio(supabase, key);
    if (!portfolio) continue;
    const metrics = pmPortfolioMetricsFull(portfolio, fondosDb);
    const sectionWeights = computePMTargetWeights(portfolio) ?? {};
    views.push({ portfolio, metrics, sectionWeights });
  }

  return <ModelPortfolios views={views} />;
}
