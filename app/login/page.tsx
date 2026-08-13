"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const supabase = createClient();
    if (mode === "signin") {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
        setBusy(false);
        return;
      }
      router.replace("/");
      router.refresh();
    } else {
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        setError(signUpError.message);
        setBusy(false);
        return;
      }
      setNotice("Cuenta creada. Si tu proyecto pide confirmar el email, revisá tu bandeja de entrada.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm pt-20">
      <div className="rounded-[10px] border border-(--line) bg-(--panel) p-6">
        <h3 className="mb-1 font-heading text-lg font-semibold text-(--paper)">
          {mode === "signin" ? "Ingresar" : "Crear cuenta de asesor"}
        </h3>
        <p className="mb-4 text-[12.5px] text-(--muted)">Plataforma AIVA — acceso de asesores.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full"
          />
          {error && <div className="text-[12px] text-(--brick)">{error}</div>}
          {notice && <div className="text-[12px] text-(--teal)">{notice}</div>}
          <button type="submit" disabled={busy}>
            {busy ? "Un momento…" : mode === "signin" ? "Ingresar" : "Crear cuenta"}
          </button>
        </form>
        <button
          type="button"
          className="mt-3 w-full bg-transparent text-[12.5px] text-(--brass) underline"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setNotice(null);
          }}
        >
          {mode === "signin" ? "¿No tenés cuenta? Creá una" : "¿Ya tenés cuenta? Ingresá"}
        </button>
      </div>
    </div>
  );
}
