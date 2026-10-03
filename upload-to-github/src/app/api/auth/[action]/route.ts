import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";
import { createSession, destroySession, getSession } from "@/lib/auth";

const Register = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(100),
});
const Login = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) });

export async function GET(_req: Request, ctx: RouteContext<"/api/auth/[action]">) {
  const { action } = await ctx.params;
  if (action !== "me") return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ user: await getSession() });
}

export async function POST(req: Request, ctx: RouteContext<"/api/auth/[action]">) {
  const { action } = await ctx.params;

  if (action === "logout") {
    await destroySession();
    return NextResponse.json({ ok: true });
  }

  const json = await req.json().catch(() => null);

  if (action === "register") {
    const p = Register.safeParse(json);
    if (!p.success) return NextResponse.json({ error: p.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    const hash = await bcrypt.hash(p.data.password, 10);
    try {
      const { rows } = await pool.query(
        "INSERT INTO users(email,name,password_hash) VALUES($1,$2,$3) RETURNING id,email,name,role",
        [p.data.email, p.data.name, hash],
      );
      await createSession(rows[0]);
      return NextResponse.json({ user: rows[0] });
    } catch (e: unknown) {
      if ((e as { code?: string }).code === "23505")
        return NextResponse.json({ error: "Email already registered" }, { status: 409 });
      throw e;
    }
  }

  if (action === "login") {
    const p = Login.safeParse(json);
    if (!p.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    const { rows } = await pool.query("SELECT id,email,name,role,password_hash FROM users WHERE email=$1", [p.data.email]);
    const u = rows[0];
    // Compare even when user is missing to keep timing uniform.
    const ok = await bcrypt.compare(p.data.password, u?.password_hash ?? "$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalid");
    if (!u || !ok) return NextResponse.json({ error: "Wrong email or password" }, { status: 401 });
    const user = { id: u.id, email: u.email, name: u.name, role: u.role };
    await createSession(user);
    return NextResponse.json({ user });
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
