import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export interface ClientBirthday {
  id: string;
  name: string;
  fechaNacimiento: string | null;
}

/** Every client of this advisor (owned + shared demo), with just enough fields for the birthdays widget. */
export async function getClientBirthdays(supabase: SupabaseClient<Database>, advisorId: string): Promise<ClientBirthday[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, fecha_nacimiento")
    .or(`advisor_id.eq.${advisorId},is_demo.eq.true`);
  if (error) throw error;
  return (data ?? []).map((c) => ({ id: c.id, name: c.name, fechaNacimiento: c.fecha_nacimiento }));
}
