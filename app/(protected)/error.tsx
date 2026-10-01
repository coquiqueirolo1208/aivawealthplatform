"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Keeps the header and nav on screen when a page fails, instead of Next's bare
 * full-page error. In production `error.message` is replaced with a generic text,
 * so the digest is what links this screen to the server log.
 */
export default function ProtectedError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-[10px] border border-(--line) bg-(--panel) p-8 text-center">
      <h2 className="mb-2 font-heading text-lg font-semibold text-(--paper)">Algo salió mal</h2>
      <p className="mb-4 text-[13px] text-(--muted)">
        No pudimos cargar o guardar esta información. Probá de nuevo — si sigue pasando, avisá a soporte
        {error.digest ? (
          <>
            {" "}
            con este código: <span className="font-mono">{error.digest}</span>
          </>
        ) : null}
        .
      </p>
      <div className="flex justify-center gap-2">
        <button type="button" onClick={() => retry()}>
          Reintentar
        </button>
        <Link href="/" className="secondary inline-block rounded-md px-4 py-2 text-[13px]">
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
