"use client";

import { useState } from "react";
import { uploadAdvisorLogo, removeAdvisorLogo } from "@/lib/actions/advisor";

export function AdvisorLogoCard({ logoUrl }: { logoUrl: string | null }) {
  const [uploading, setUploading] = useState(false);

  return (
    <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
      <h3 className="mb-1 font-heading text-base font-semibold text-(--paper)">Logo del asesor</h3>
      <p className="mb-3 text-[12px] text-(--muted)">
        Aparece junto a &ldquo;Powered by AIVA Wealth&rdquo; en los reportes PDF que exportes. PNG o JPG, hasta 2MB.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed Supabase Storage URL, not a static/local asset
          <img
            src={logoUrl}
            alt="Logo del asesor"
            className="h-16 w-16 rounded-lg object-contain p-1.5"
            style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}
          />
        ) : (
          <div
            className="flex h-16 w-16 items-center justify-center rounded-lg text-center text-[10.5px] text-(--muted)"
            style={{ background: "var(--panel-2)", border: "1px dashed var(--line)" }}
          >
            Sin logo
          </div>
        )}
        <form
          action={async (fd) => {
            setUploading(true);
            try {
              await uploadAdvisorLogo(fd);
            } finally {
              setUploading(false);
            }
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <input type="file" name="logo" accept="image/png,image/jpeg" required />
          <button type="submit" disabled={uploading}>
            {uploading ? "Subiendo…" : logoUrl ? "Actualizar" : "Subir logo"}
          </button>
        </form>
        {logoUrl && (
          <form action={removeAdvisorLogo}>
            <button type="submit" className="secondary">
              Quitar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
