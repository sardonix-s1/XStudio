import { adminClient, guard, reply } from "@/lib/admin-server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES = ["pending", "approved", "rejected"];

export async function PATCH(req: Request) {
  const g = await guard(req, true);
  if ("res" in g) return g.res;
  const b = await req.json().catch(() => ({}));
  if (!UUID.test(String(b.id)) || !STATUSES.includes(b.status)) return reply(g.ctx, { error: "Bad request" }, 400);
  const { error } = await adminClient()!.from("reviews").update({ status: b.status }).eq("id", b.id);
  if (error) return reply(g.ctx, { error: "Could not update." }, 500);
  return reply(g.ctx, { ok: true });
}

export async function DELETE(req: Request) {
  const g = await guard(req, true);
  if ("res" in g) return g.res;
  const b = await req.json().catch(() => ({}));
  if (!UUID.test(String(b.id))) return reply(g.ctx, { error: "Bad request" }, 400);
  const { error } = await adminClient()!.from("reviews").delete().eq("id", b.id);
  if (error) return reply(g.ctx, { error: "Could not delete." }, 500);
  return reply(g.ctx, { ok: true });
}
