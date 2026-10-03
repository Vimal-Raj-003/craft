import { NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";

const Newsletter = z.object({ email: z.string().trim().toLowerCase().email() });
const Custom = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  idea: z.string().trim().min(10).max(2000),
  budget: z.string().trim().max(40).optional(),
});

export async function POST(req: Request, ctx: RouteContext<"/api/contact/[kind]">) {
  const { kind } = await ctx.params;
  const json = await req.json().catch(() => null);

  if (kind === "newsletter") {
    const p = Newsletter.safeParse(json);
    if (!p.success) return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
    await pool.query("INSERT INTO newsletter(email) VALUES($1) ON CONFLICT DO NOTHING", [p.data.email]);
    return NextResponse.json({ ok: true });
  }
  if (kind === "custom") {
    const p = Custom.safeParse(json);
    if (!p.success) return NextResponse.json({ error: p.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    await pool.query("INSERT INTO custom_requests(name,email,idea,budget) VALUES($1,$2,$3,$4)", [
      p.data.name, p.data.email, p.data.idea, p.data.budget ?? null,
    ]);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
