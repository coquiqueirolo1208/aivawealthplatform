"use client";

import { useState } from "react";
import { updateClientPersonalData } from "@/lib/actions/clients";
import { SubmitButton } from "@/components/ui/submit-button";

export interface ClientPersonalData {
  name: string;
  email: string | null;
  celular: string | null;
  direccion: string | null;
  pareja: string | null;
  hijos: string | null;
}

const FIELDS: Array<{ key: Exclude<keyof ClientPersonalData, "name">; label: string; type?: string; placeholder?: string }> = [
  { key: "email", label: "Email", type: "email" },
  { key: "celular", label: "Celular", type: "tel" },
  { key: "direccion", label: "Dirección" },
  { key: "pareja", label: "Pareja" },
  { key: "hijos", label: "Hijos", placeholder: "Nombres / edades" },
];

export function PersonalDataCard({ clientId, data }: { clientId: string; data: ClientPersonalData }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="m-0 font-heading text-base font-semibold text-(--paper)">Datos personales</h3>
        {!editing && (
          <button type="button" className="secondary px-2.5 py-1 text-[11px]" onClick={() => setEditing(true)}>
            Editar
          </button>
        )}
      </div>

      {editing ? (
        <form
          action={async (fd) => {
            const result = await updateClientPersonalData(clientId, fd);
            setError(result.error);
            if (!result.error) setEditing(false);
          }}
          className="flex flex-col gap-2"
        >
          <label className="block">
            <span className="mb-1 block text-[11px] text-(--muted)">Nombre</span>
            <input type="text" name="name" defaultValue={data.name} required className="w-full" />
          </label>
          {FIELDS.map((f) => (
            <label key={f.key} className="block">
              <span className="mb-1 block text-[11px] text-(--muted)">{f.label}</span>
              <input type={f.type ?? "text"} name={f.key} defaultValue={data[f.key] ?? ""} placeholder={f.placeholder} className="w-full" />
            </label>
          ))}
          {error && <div className="text-[12px] text-(--brick)">{error}</div>}
          <div className="flex gap-2">
            <SubmitButton className="px-3.5 py-1.5 text-[12px]" pendingText="Guardando…">
              Guardar
            </SubmitButton>
            <button
              type="button"
              className="secondary px-3.5 py-1.5 text-[12px]"
              onClick={() => {
                setError(null);
                setEditing(false);
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[12.5px]">
          {FIELDS.map((f) => (
            <div key={f.key} className="contents">
              <dt className="text-(--muted)">{f.label}</dt>
              <dd className="m-0 text-(--paper)">
                {f.key === "email" && data.email ? (
                  <a href={`mailto:${data.email}`} className="text-(--brass) underline">
                    {data.email}
                  </a>
                ) : (
                  data[f.key] || "—"
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
