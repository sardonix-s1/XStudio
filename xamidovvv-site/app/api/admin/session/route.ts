import { guard, reply } from "@/lib/admin-server";

export async function GET(req: Request) {
  const g = await guard(req, false);
  if ("res" in g) return g.res;
  return reply(g.ctx, { admin: true, email: g.ctx.email });
}
