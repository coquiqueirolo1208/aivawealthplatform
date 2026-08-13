"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { RISK_QUESTIONS } from "@/lib/constants";
import { computeRiskProfile, type RiskAnswers } from "@/lib/risk";

export async function saveRiskProfile(clientId: string, formData: FormData) {
  const answers: RiskAnswers = {};
  for (const q of RISK_QUESTIONS) {
    const raw = formData.get(q.id);
    if (raw !== null) answers[q.id] = Number(raw);
  }
  if (Object.keys(answers).length < RISK_QUESTIONS.length) return;

  const { score, profile } = computeRiskProfile(answers);
  const supabase = await createClient();
  const { error } = await supabase.from("risk_profiles").upsert({
    client_id: clientId,
    answers,
    score,
    profile,
    completed_at: new Date().toISOString(),
  });
  if (error) throw error;
  revalidatePath(`/clientes/${clientId}`);
}
