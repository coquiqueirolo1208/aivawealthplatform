import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdvisorLogoUrl, getAdvisorWeeklyEmailEnabled } from "@/lib/queries/advisor";
import { AdvisorLogoCard } from "@/components/office/advisor-logo-card";
import { WeeklyEmailToggle } from "@/components/office/weekly-email-toggle";

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [logoUrl, weeklyEmailEnabled] = await Promise.all([
    getAdvisorLogoUrl(supabase, user.id),
    getAdvisorWeeklyEmailEnabled(supabase, user.id),
  ]);

  return (
    <div>
      <h2 className="mb-4 font-heading text-xl font-semibold text-(--paper)">Configuración</h2>
      <div className="flex flex-col gap-4">
        <AdvisorLogoCard logoUrl={logoUrl} />
        <WeeklyEmailToggle initialEnabled={weeklyEmailEnabled} />
      </div>
    </div>
  );
}
