import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { ClientTabs } from "@/components/clients/client-tabs";
import { BirthdayField } from "@/components/clients/birthday-field";
import { HouseholdField } from "@/components/clients/household-field";

export default async function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const { supabase } = await requireUser();

  // RLS scopes this to the current advisor — a client owned by someone else (or a
  // bad id) simply returns no row here, which we treat as not found.
  const [{ data: client }, { data: accounts }] = await Promise.all([
    supabase.from("clients").select("id, name, fecha_nacimiento, household_label").eq("id", clientId).maybeSingle(),
    supabase.from("accounts").select("id, label").eq("client_id", clientId).order("label"),
  ]);
  if (!client) notFound();

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="font-heading text-xl font-semibold text-(--paper)">{client.name}</div>
        <div className="flex flex-wrap items-center gap-1.5">
          <HouseholdField clientId={clientId} householdLabel={client.household_label} />
          <BirthdayField clientId={clientId} fechaNacimiento={client.fecha_nacimiento} />
        </div>
      </div>
      <ClientTabs clientId={clientId} accounts={accounts ?? []} />
      {children}
    </div>
  );
}
