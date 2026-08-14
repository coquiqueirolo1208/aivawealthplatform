"use client";

import { useState } from "react";
import { askIaAdvisor } from "@/lib/actions/ia-advisor";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export function IaAdvisorModal({ onClose }: { onClose: () => void }) {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [thinking, setThinking] = useState(false);

  async function send() {
    const q = question.trim();
    if (!q || thinking) return;
    setHistory((h) => [...h, { role: "user", text: q }]);
    setQuestion("");
    setThinking(true);
    try {
      const reply = await askIaAdvisor(q);
      setHistory((h) => [...h, { role: "assistant", text: reply }]);
    } catch {
      setHistory((h) => [...h, { role: "assistant", text: "Hubo un error al responder. Probá de nuevo." }]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[2200] flex items-center justify-center p-5" style={{ background: "rgba(19,31,56,0.65)" }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-[10px] p-5" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="m-0 font-heading text-base font-semibold text-(--paper)">IA Advisor</h3>
          <button type="button" className="secondary px-2.5 py-1 text-[11px]" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <div className="mb-3 flex-1 overflow-y-auto rounded-lg p-3" style={{ background: "var(--panel-2)", minHeight: 200 }}>
          {history.length === 0 ? (
            <div className="p-4 text-center text-[12.5px] text-(--muted)">
              Preguntá algo sobre fondos, mercados, portafolios o tus clientes…
            </div>
          ) : (
            history.map((m, i) => (
              <div key={i} className="mb-2.5">
                <div className="mb-0.5 text-[10.5px] font-semibold text-(--muted) uppercase">{m.role === "user" ? "Vos" : "IA Advisor"}</div>
                <div className="whitespace-pre-wrap text-[12.5px] text-(--paper-dim)">{m.text}</div>
              </div>
            ))
          )}
          {thinking && <div className="text-[12px] text-(--muted)">Pensando…</div>}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Preguntá algo sobre fondos, mercados, portafolios o tus clientes…"
            className="flex-1"
          />
          <button type="submit" disabled={thinking}>
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
