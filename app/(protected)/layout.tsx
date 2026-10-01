import { requireUser } from "@/lib/supabase/server";
import { IdleLogout } from "@/components/idle-logout";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <>
      <IdleLogout />
      {children}
    </>
  );
}
