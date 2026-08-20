"use client";

import { useState } from "react";
import { updateClientHousehold } from "@/lib/actions/clients";

export function HouseholdField({ clientId, householdLabel }: { clientId: string; householdLabel: string | null }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <form
        action={async (fd) => {
          await updateClientHousehold(clientId, String(fd.get("household") ?? ""));
          setEditing(false);
        }}
        className="flex items-center gap-1.5"
      >
        <input
          type="text"
          name="household"
          placeholder="Nombre del núcleo familiar"
          defaultValue={householdLabel ?? ""}
          autoFocus
          className="text-[12px]"
        />
        <button type="submit" className="px-2 py-1 text-[11px]">
          Guardar
        </button>
        <button type="button" className="secondary px-2 py-1 text-[11px]" onClick={() => setEditing(false)}>
          ✕
        </button>
      </form>
    );
  }

  return (
    <button type="button" className="secondary px-2.5 py-1 text-[11px]" onClick={() => setEditing(true)}>
      {householdLabel ? `👪 ${householdLabel}` : "+ agrupar en núcleo familiar"}
    </button>
  );
}
