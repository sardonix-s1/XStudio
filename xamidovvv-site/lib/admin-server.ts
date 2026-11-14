import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const COOKIE_AT = "xa_at";
export const COOKIE_RT = "xa_rt";

/** Server-only client with the Secret key. It bypasses RLS, so it is used ONLY after the admin check below. */
export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY; // no NEXT_PUBLIC_ prefix: never sent to the browser
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

type Fresh = { access_token: string; refresh_token: string; expires_in: number };
export type AdminCtx = { email: string; fresh?: Fresh };

export function setSessionCookies(res: NextResponse, s: Fresh) {
  const base = { httpOnly: true, sameSite: "strict" as const, secure: process.env.NODE_ENV === "production", path: "/" };
  res.cookies.set(COOKIE_AT, s.access_token, { ...base, maxAge: Math.max(60, s.expires_in) });
  res.cookies.set(COOKIE_RT, s.refresh_token, { ...base, maxAge: 60 * 60 * 24 * 30 });
}
export function clearSessionCookies(res: NextResponse) {
  res.cookies.set(COOKIE_AT, "", { path: "/", maxAge: 0 });
  res.cookies.set(COOKIE_RT, "", { path: "/", maxAge: 0 });
}

/** Is this e-mail in the `admins` table? (the table is readable only with the Secret key) */
export async function isAdminEmail(email: string | undefined | null): Promise<boolean> {
  const a = adminClient();
  if (!a || !email) return false;
  const { data } = await a.from("admins").select("email").eq("email", email.toLowerCase()).maybeSingle();
  return Boolean(data);
}

/** Validates the session cookies (refreshing if needed) and checks that the user is an admin. */
export async function authenticate(): Promise<AdminCtx | null> {
  const a = adminClient();
  if (!a) return null;
  const jar = cookies();
  const at = jar.get(COOKIE_AT)?.value;
  const rt = jar.get(COOKIE_RT)?.value;
  let email: string | undefined;
  let fresh: Fresh | undefined;
  if (at) {
    const { data } = await a.auth.getUser(at);
    email = data.user?.email ?? undefined;
  }
  if (!email && rt) {
    const pub = getSupabase();
    const r = pub ? await pub.auth.refreshSession({ refresh_token: rt }) : null;
    if (r?.data.session) {
      const s = r.data.session;
      email = s.user.email ?? undefined;
      fresh = { access_token: s.access_token, refresh_token: s.refresh_token, expires_in: s.expires_in };
    }
  }
  if (!email || !(await isAdminEmail(email))) return null;
  return { email, fresh };
}

/** CSRF guard for state-changing requests: the Origin header must match this host. */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function reply(ctx: AdminCtx | null, body: unknown, status = 200) {
  const res = NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
  if (ctx?.fresh) setSessionCookies(res, ctx.fresh);
  return res;
}

/** Common gate for admin API routes: returns a ready error response, or the admin context. */
export async function guard(req: Request, mutating: boolean): Promise<{ res: NextResponse } | { ctx: AdminCtx }> {
  if (mutating && !sameOrigin(req)) return { res: reply(null, { error: "Forbidden" }, 403) };
  const ctx = await authenticate();
  if (!ctx) return { res: reply(null, { error: "Unauthorized" }, 401) };
  return { ctx };
}
