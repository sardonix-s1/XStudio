import { adminClient, guard, reply } from "@/lib/admin-server";

const KEYS = ["telegram", "channel", "instagram", "tiktok"] as const;

function httpsUrl(v: string) {
  try {
    return new URL(v).protocol === "https:";
  } catch {
    return false;
  }
}

export async function PUT(req: Request) {
  const g = await guard(req, true);
  if ("res" in g) return g.res;
  const b = await req.json().catch(() => ({}));
  const row: Record<string, string> = {};
  for (const k of KEYS) {
    const v = String(b[k] ?? "").trim();
    if (v && (v.length > 200 || !httpsUrl(v))) return reply(g.ctx, { error: `${k}: enter a link starting with https://` }, 400);
    row[k] = v;
  }
  const phone = String(b.phone ?? "").trim();
  if (phone.length > 30 || !/^[+\d\s()-]*$/.test(phone)) return reply(g.ctx, { error: "phone: digits, spaces, + ( ) - only" }, 400);
  row.phone = phone;
  const { error } = await adminClient()!.from("site_settings").update(row).eq("id", 1);
  if (error) return reply(g.ctx, { error: "Could not save." }, 500);
  return reply(g.ctx, { ok: true });
}
