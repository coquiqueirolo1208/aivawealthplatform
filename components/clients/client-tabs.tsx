"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { addAccount, deleteAccount } from "@/lib/actions/accounts";

export interface AccountTabInfo {
  id: string;
  label: string;
}

export function ClientTabs({ clientId, accounts }: { clientId: string; accounts: AccountTabInfo[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // whitespace-nowrap keeps each tab's full label (the custodian name, for account
  // tabs) on one line — the tab itself grows to fit it instead of wrapping/clipping,
  // and the nav's flex-wrap moves whole tabs to the next row when they don't fit.
  function tabClass(active: boolean) {
    return active
      ? "flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-[13.5px] font-medium whitespace-nowrap"
      : "flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-[13.5px] font-medium whitespace-nowrap";
  }

  const consolidadoActive = pathname === `/clientes/${clientId}` || pathname === `/clientes/${clientId}/consolidado`;

  return (
    <nav className="mb-5 flex flex-wrap gap-1.5">
      <Link href="/clientes" className="flex items-center px-1 py-2.5 text-[13.5px] font-medium text-(--brass)">
        ← Mis Clientes
      </Link>
      <Link
        href={`/clientes/${clientId}/consolidado`}
        className={tabClass(consolidadoActive)}
        style={{
          background: consolidadoActive ? "var(--panel-2)" : "var(--panel)",
          border: `1px solid ${consolidadoActive ? "var(--brass-dim)" : "var(--line)"}`,
          color: "var(--paper)",
        }}
      >
        Consolidado
      </Link>
      {accounts.map((a) => {
        const active = pathname === `/clientes/${clientId}/cuentas/${a.id}`;
        return (
          <span key={a.id} className="relative">
            <Link
              href={`/clientes/${clientId}/cuentas/${a.id}`}
              className={tabClass(active)}
              style={{
                background: active ? "var(--panel-2)" : "var(--panel)",
                border: `1px solid ${active ? "var(--brass-dim)" : "var(--line)"}`,
                color: "var(--paper)",
                paddingRight: 28,
              }}
            >
              {a.label}
            </Link>
            {confirmingId === a.id ? (
              <button
                type="button"
                title={`Confirmar: borrar "${a.label}" y todos sus datos`}
                className="absolute top-1.5 right-1.5 bg-(--brick) p-0 px-1 text-[9px] text-white"
                onClick={() => {
                  deleteAccount(clientId, a.id).then(() => router.refresh());
                }}
              >
                ¿Confirmar?
              </button>
            ) : (
              <button
                type="button"
                title="Borrar cuenta"
                className="absolute top-1.5 right-1.5 bg-transparent p-0 text-[10px] text-(--muted)"
                onClick={() => setConfirmingId(a.id)}
              >
                ✕
              </button>
            )}
          </span>
        );
      })}
      {adding ? (
        <form
          action={async (fd) => {
            await addAccount(clientId, fd);
            setAdding(false);
          }}
          className="flex items-center gap-1.5"
        >
          <input type="text" name="label" placeholder="Nombre de cuenta" autoFocus required className="w-36" />
          <input type="text" name="custodian" placeholder="Custodio" className="w-32" />
          <button type="submit" className="px-2.5 py-1.5 text-[12px]">
            +
          </button>
          <button type="button" className="secondary px-2.5 py-1.5 text-[12px]" onClick={() => setAdding(false)}>
            ✕
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="rounded-t-lg border border-dashed px-4 py-2.5 text-[13.5px] font-semibold"
          style={{ background: "transparent", borderColor: "var(--brass)", color: "var(--brass)" }}
          onClick={() => setAdding(true)}
        >
          + agregar cuenta
        </button>
      )}
    </nav>
  );
}
