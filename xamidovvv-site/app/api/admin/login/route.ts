import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { isAdminEmail, reply, sameOrigin, setSessionCookies } from "@/lib/admin-server";

const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 8;
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return reply(null, { error: "Forbidden" }, 403);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (limited(ip)) return reply(null, { error: "Too many attempts. Try again later." }, 429);

  let b: { email?: unknown; password?: unknown };
  try {
    b = await req.json();
  } catch {
    return reply(null, { error: "Bad request" }, 400);
  }
  const email = String(b.email ?? "").trim().toLowerCase();
  const password = String(b.password ?? "");
  if (!email || !password) return reply(null, { error: "Enter email and password." }, 400);

  const pub = getSupabase();
  if (!pub) return reply(null, { error: "Server is not configured." }, 503);
  const { data, error } = await pub.auth.signInWithPassword({ email, password });
  // Same message for a wrong password and for a valid user who is not an admin.
  if (error || !data.session || !(await isAdminEmail(data.user?.email))) {
    return reply(null, { error: "Invalid credentials or no access." }, 401);
  }
  const res = NextResponse.json({ ok: true, email: data.user.email }, { headers: { "Cache-Control": "no-store" } });
  setSessionCookies(res, data.session);
  return res;
}
