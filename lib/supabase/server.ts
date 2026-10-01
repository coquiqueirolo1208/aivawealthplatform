import { cache } from "react";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

/** For Server Components, Route Handlers and Server Actions. Must be awaited. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component render — safe to ignore since proxy.ts
            // refreshes the session cookie on every request anyway.
          }
        },
      },
    },
  );
}

/**
 * One Supabase client per request, shared by the root layout, nested layouts and the
 * page. Query helpers wrapped in React `cache()` are keyed by their arguments, so
 * they only deduplicate when every caller passes this same client instance.
 */
export const getRequestSupabase = cache(createClient);

/** The signed-in user, looked up once per request (each layout and page used to call Auth on its own). */
export const getCurrentUser = cache(async () => {
  const supabase = await getRequestSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** For protected pages: the signed-in user plus the shared client, or a redirect to /login. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return { user, supabase: await getRequestSupabase() };
}
