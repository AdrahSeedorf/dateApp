import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Supabase client for Server Components, Route Handlers and Server Actions.
 * Reads and writes the auth session via cookies.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // Safe to ignore — middleware refreshes the session instead.
          }
        },
      },
    }
  );
}

/**
 * Privileged client that BYPASSES Row Level Security.
 *
 * Only ever use this in trusted server code where the operation genuinely
 * cannot be expressed through RLS — currently just redeeming an invite
 * token, which by definition happens before the user has a session.
 *
 * Never import this into a Client Component.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local (server-side only)."
    );
  }

  // Deliberately NOT the @supabase/ssr helper. That one is built around a
  // cookie-backed user session and will attach the signed-in user's token,
  // which overrides the service role and breaks auth.admin.* calls.
  // The plain client keeps the service key as the auth header.
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
