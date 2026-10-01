import { createClient } from "@/lib/supabase/server";
import { getFunds, getModelPortfolio } from "@/lib/queries/reference";
import { computePMTargetWeights, pmPortfolioMetricsFull } from "@/lib/finance";
import { ModelPortfolios, type ModelPortfolioView } from "@/components/research/model-portfolios";

const PROFILE_KEYS = ["conservador", "balanceado", "dinamico"] as const;

export default async function PortafoliosPage() {
  const supabase = await createClient();
  // Funds and the three model portfolios are independent — load them together
  // instead of one after another.
  const [fondosDb, portfolios] = await Promise.all([
    getFunds(supabase),
    Promise.all(PROFILE_KEYS.map((key) => getModelPortfolio(supabase, key))),
  ]);

  const views: ModelPortfolioView[] = [];
  for (const portfolio of portfolios) {
    if (!portfolio) continue;
    const metrics = pmPortfolioMetricsFull(portfolio, fondosDb);
    const sectionWeights = computePMTargetWeights(portfolio) ?? {};
    views.push({ portfolio, metrics, sectionWeights });
  }

  return <ModelPortfolios views={views} />;
}
