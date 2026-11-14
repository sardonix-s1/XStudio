import { adminClient, guard, reply } from "@/lib/admin-server";

export async function GET(req: Request) {
  const g = await guard(req, false);
  if ("res" in g) return g.res;
  const a = adminClient()!;
  const [r, s] = await Promise.all([
    a.from("reviews").select("id,name,url,rating,text,status,created_at").order("created_at", { ascending: false }).limit(300),
    a.from("site_settings").select("telegram,channel,instagram,tiktok,phone").eq("id", 1).maybeSingle(),
  ]);
  if (r.error) return reply(g.ctx, { error: "Could not load reviews." }, 500);
  return reply(g.ctx, { reviews: r.data ?? [], settings: s.data ?? {} });
}
