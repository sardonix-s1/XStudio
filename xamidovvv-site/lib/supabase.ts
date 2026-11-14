import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True for a Secret key (sb_secret_...) or a legacy service_role JWT. Those must never be used in a public variable. */
export function isPrivilegedKey(k: string): boolean {
  if (k.startsWith("sb_secret_")) return true;
  try {
    const part = k.split(".")[1];
    if (part) return JSON.parse(Buffer.from(part, "base64url").toString()).role === "service_role";
  } catch {
    /* not a JWT */
  }
  return false;
}

/**
 * Public (publishable) client. Safe for anonymous reads and inserts; access is limited by RLS.
 * Refuses to start if a Secret key was put into NEXT_PUBLIC_SUPABASE_ANON_KEY by mistake.
 */
export function getSupabase() {
  if (!url || !key) return null;
  if (isPrivilegedKey(key)) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY contains a SECRET key. Put the publishable key (sb_publishable_...) there, and rotate the secret key in Supabase."
    );
    return null;
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
