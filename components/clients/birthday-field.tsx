"use client";

import { useState } from "react";
import { updateClientBirthday } from "@/lib/actions/clients";
import { fmtDate } from "@/lib/format";

export function BirthdayField({ clientId, fechaNacimiento }: { clientId: string; fechaNacimiento: string | null }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <form
        action={async (fd) => {
          await updateClientBirthday(clientId, String(fd.get("fecha") ?? ""));
          setEditing(false);
        }}
        className="flex items-center gap-1.5"
      >
        <input type="date" name="fecha" defaultValue={fechaNacimiento ?? ""} autoFocus className="text-[12px]" />
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
      {fechaNacimiento ? `🎂 ${fmtDate(fechaNacimiento)}` : "+ agregar cumpleaños"}
    </button>
  );
}
