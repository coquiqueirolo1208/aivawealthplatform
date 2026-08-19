"use client";

import { updateHoldingUsSitus } from "@/lib/actions/accounts";

export function UsSitusCheckbox({
  clientId,
  accountId,
  month,
  nombre,
  checked,
}: {
  clientId: string;
  accountId: string;
  month: string;
  nombre: string;
  checked: boolean;
}) {
  return (
    <input
      type="checkbox"
      defaultChecked={checked}
      title="Acción/ETF de EEUU (US situs) — precargado por nombre, confirmá o corregí a mano"
      onChange={(e) => updateHoldingUsSitus(clientId, accountId, month, nombre, e.target.checked)}
    />
  );
}
