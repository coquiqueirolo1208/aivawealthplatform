"use client";

import { useState } from "react";
import { RISK_QUESTIONS, type RiskProfileKey } from "@/lib/constants";
import { saveRiskProfile } from "@/lib/actions/risk-profile";

const PROFILE_LABELS: Record<RiskProfileKey, string> = {
  conservador: "Conservador",
  balanceado: "Moderado",
  dinamico: "Agresivo",
};

export interface RiskProfileData {
  answers: Record<string, number>;
  score: number;
  profile: RiskProfileKey;
  completedAt: string;
}

export function RiskProfileCard({ clientId, existing }: { clientId: string; existing: RiskProfileData | null }) {
  const [editing, setEditing] = useState(!existing);
  const [answers, setAnswers] = useState<Record<string, number>>(existing?.answers ?? {});

  if (!editing && existing) {
    return (
      <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-base font-semibold text-(--paper)">Perfil de riesgo</h3>
          <button type="button" className="secondary px-2.5 py-1 text-[11px]" onClick={() => setEditing(true)}>
            Editar
          </button>
        </div>
        <div className="mt-2 text-[13px] text-(--paper-dim)">
          Perfil resultante: <span className="font-semibold text-(--brass)">{PROFILE_LABELS[existing.profile]}</span>{" "}
          <span className="font-mono text-[11px] text-(--muted)">
            (score {existing.score}/20 · completado {new Date(existing.completedAt).toLocaleDateString()})
          </span>
        </div>
      </div>
    );
  }

  const allAnswered = RISK_QUESTIONS.every((q) => answers[q.id] != null);

  return (
    <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
      <h3 className="mb-1 font-heading text-base font-semibold text-(--paper)">Cuestionario de idoneidad</h3>
      <p className="mb-3 text-[12px] text-(--muted)">Perfil de riesgo</p>
      <form action={(fd) => saveRiskProfile(clientId, fd)}>
        {RISK_QUESTIONS.map((q) => (
          <div key={q.id} className="mb-4">
            <div className="mb-1.5 text-[13px] text-(--paper)">{q.text}</div>
            <div className="flex flex-wrap gap-1.5">
              {q.options.map(([label, value]) => {
                const selected = answers[q.id] === value;
                return (
                  <label key={value} className="cursor-pointer">
                    <input
                      type="radio"
                      name={q.id}
                      value={value}
                      checked={selected}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: value }))}
                      className="sr-only"
                    />
                    <span
                      className="block rounded-full px-2.5 py-1 text-[11.5px]"
                      style={{
                        border: `1px solid ${selected ? "var(--brass)" : "var(--line)"}`,
                        color: selected ? "var(--brass)" : "var(--paper-dim)",
                        fontWeight: selected ? 600 : 400,
                      }}
                    >
                      {label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
        <div className="flex gap-2">
          <button type="submit" disabled={!allAnswered}>
            Guardar
          </button>
          {existing && (
            <button type="button" className="secondary" onClick={() => setEditing(false)}>
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
