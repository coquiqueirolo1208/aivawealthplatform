import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClientTabs } from "@/components/clients/client-tabs";
import { BirthdayField } from "@/components/clients/birthday-field";

export default async function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS scopes this to the current advisor — a client owned by someone else (or a
  // bad id) simply returns no row here, which we treat as not found.
  const { data: client } = await supabase.from("clients").select("id, name, fecha_nacimiento").eq("id", clientId).maybeSingle();
  if (!client) notFound();

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, label")
    .eq("client_id", clientId)
    .order("label");

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="font-heading text-xl font-semibold text-(--paper)">{client.name}</div>
        <BirthdayField clientId={clientId} fechaNacimiento={client.fecha_nacimiento} />
      </div>
      <ClientTabs clientId={clientId} accounts={accounts ?? []} />
      {children}
    </div>
  );
}
