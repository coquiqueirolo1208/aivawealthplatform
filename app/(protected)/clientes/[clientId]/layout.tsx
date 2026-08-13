import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClientTabs } from "@/components/clients/client-tabs";

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
  const { data: client } = await supabase.from("clients").select("id, name").eq("id", clientId).maybeSingle();
  if (!client) notFound();

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, label")
    .eq("client_id", clientId)
    .order("label");

  return (
    <div>
      <div className="mb-2 font-heading text-xl font-semibold text-(--paper)">{client.name}</div>
      <ClientTabs clientId={clientId} accounts={accounts ?? []} />
      {children}
    </div>
  );
}
