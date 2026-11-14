import { NextResponse } from "next/server";
import { clearSessionCookies, reply, sameOrigin } from "@/lib/admin-server";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return reply(null, { error: "Forbidden" }, 403);
  const res = NextResponse.json({ ok: true });
  clearSessionCookies(res);
  return res;
}
