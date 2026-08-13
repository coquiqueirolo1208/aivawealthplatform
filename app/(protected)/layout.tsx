import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IdleLogout } from "@/components/idle-logout";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return (
    <>
      <IdleLogout />
      {children}
    </>
  );
}
