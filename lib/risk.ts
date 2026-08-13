// Ported verbatim from dashboard_patrimonial_13.html computeRiskProfile (line 3843).
import { RISK_QUESTIONS, type RiskProfileKey } from "@/lib/constants";

export type RiskAnswers = Partial<Record<(typeof RISK_QUESTIONS)[number]["id"], number>>;

export interface RiskProfileResult {
  score: number;
  profile: RiskProfileKey;
}

/** Sum of 5 answers (1-4 each, range 5-20). score<=9 conservador, 10-15 balanceado, >=16 dinamico. */
export function computeRiskProfile(answers: RiskAnswers): RiskProfileResult {
  const score = RISK_QUESTIONS.reduce((s, q) => s + (answers[q.id] || 0), 0);
  const profile: RiskProfileKey = score <= 9 ? "conservador" : score <= 15 ? "balanceado" : "dinamico";
  return { score, profile };
}
