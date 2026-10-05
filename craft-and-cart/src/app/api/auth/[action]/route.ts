import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";
import { createSession, destroySession, getSession } from "@/lib/auth";
import { clearRateLimit, clientIp, fail, PHONE_RE, rateLimit, sameOrigin } from "@/lib/http";
import { sendMail } from "@/lib/mail";
import { siteUrl } from "@/lib/site";

const Password = z.string().min(8, "Password must be at least 8 characters").max(100);
const Register = z.object({
  name: z.string().trim().min(2, "Please enter your full name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: z.string().trim().regex(PHONE_RE, "Enter a valid phone number"),
  password: Password,
});
const Login = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(100) });
const Forgot = z.object({ email: z.string().trim().toLowerCase().email() });
const Reset = z.object({ token: z.string().regex(/^[0-9a-f]{64}$/), password: Password });

// Compared even when the account is missing so the response time doesn't reveal which emails exist.
const DUMMY_HASH = "$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalid";
const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

export async function GET(_req: Request, ctx: RouteContext<"/api/auth/[action]">) {
  const { action } = await ctx.params;
  if (action !== "me") return fail("Not found", 404);
  const res = NextResponse.json({ user: await getSession() });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function POST(req: Request, ctx: RouteContext<"/api/auth/[action]">) {
  const { action } = await ctx.params;
  if (!sameOrigin(req)) return fail("Forbidden", 403);

  if (action === "logout") {
    await destroySession();
    return NextResponse.json({ ok: true });
  }

  const json = await req.json().catch(() => null);
  const ip = clientIp(req);

  if (action === "register") {
    if (!rateLimit(`reg:${ip}`, 10, 60 * 60_000)) return fail("Too many sign-ups from this network. Please try later.", 429);
    const p = Register.safeParse(json);
    if (!p.success) return fail(p.error.issues[0]?.message ?? "Invalid input");
    const hash = await bcrypt.hash(p.data.password, 10);
    try {
      const { rows } = await pool.query(
        "INSERT INTO users(email,name,phone,password_hash,role) VALUES($1,$2,$3,$4,'CUSTOMER') RETURNING id,email,name,role",
        [p.data.email, p.data.name, p.data.phone, hash],
      );
      await createSession(rows[0]);
      return NextResponse.json({ user: rows[0] });
    } catch (e: unknown) {
      if ((e as { code?: string }).code === "23505") return fail("Email already registered", 409);
      throw e;
    }
  }

  // "login" is for everybody; "admin-login" (the /admin/login page) only ever accepts staff (ADMIN or SUPER_ADMIN), never a customer.
  if (action === "login" || action === "admin-login") {
    const p = Login.safeParse(json);
    if (!p.success) return fail("Invalid input");
    const keyIp = `login:${ip}`;
    const keyEmail = `login:${p.data.email}`;
    if (!rateLimit(keyIp, 30, 15 * 60_000) || !rateLimit(keyEmail, 8, 15 * 60_000)) {
      return fail("Too many attempts. Please wait 15 minutes and try again.", 429);
    }
    const { rows } = await pool.query("SELECT id,email,name,role,password_hash FROM users WHERE email=$1", [p.data.email]);
    const u = rows[0];
    const ok = await bcrypt.compare(p.data.password, u?.password_hash ?? DUMMY_HASH);
    if (!u || !ok || (action === "admin-login" && u.role === "CUSTOMER")) return fail("Wrong email or password", 401);
    clearRateLimit(keyEmail);
    const user = { id: u.id, email: u.email, name: u.name, role: u.role };
    await createSession(user);
    return NextResponse.json({ user });
  }

  if (action === "forgot") {
    const p = Forgot.safeParse(json);
    if (!p.success) return fail("Enter a valid email");
    // Same answer whether or not the email exists.
    const generic = NextResponse.json({ ok: true });
    if (!rateLimit(`forgot:${ip}`, 10, 60 * 60_000) || !rateLimit(`forgot:${p.data.email}`, 3, 60 * 60_000)) return generic;
    const { rows } = await pool.query("SELECT id,name FROM users WHERE email=$1", [p.data.email]);
    const u = rows[0];
    if (u) {
      const token = crypto.randomBytes(32).toString("hex");
      await pool.query("DELETE FROM password_resets WHERE user_id=$1 AND used_at IS NULL", [u.id]);
      await pool.query("INSERT INTO password_resets(user_id,token_hash,expires_at) VALUES($1,$2, now() + interval '1 hour')", [u.id, sha256(token)]);
      const link = `${siteUrl()}/reset-password?token=${token}`;
      try {
        const sent = await sendMail(
          p.data.email,
          "Reset your Craft & Cart password",
          `Hi ${u.name},\n\nUse this link within 1 hour to choose a new password:\n${link}\n\nIf you didn't ask for this, you can ignore this email.\n\nCraft & Cart`,
        );
        if (!sent) {
          if (process.env.NODE_ENV === "production") console.warn("Password reset requested but SMTP is not configured; no email was sent.");
          else console.log(`[dev] password reset link for ${p.data.email}: ${link}`);
        }
      } catch (e) {
        console.error("Could not send reset email", e);
      }
    }
    return generic;
  }

  if (action === "reset") {
    const p = Reset.safeParse(json);
    if (!p.success) return fail(p.error.issues[0]?.message ?? "Invalid or expired link");
    if (!rateLimit(`reset:${ip}`, 20, 60 * 60_000)) return fail("Too many attempts. Please try later.", 429);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        "UPDATE password_resets SET used_at=now() WHERE token_hash=$1 AND used_at IS NULL AND expires_at > now() RETURNING user_id",
        [sha256(p.data.token)],
      );
      if (!rows[0]) {
        await client.query("ROLLBACK");
        return fail("This link is invalid or has expired. Please request a new one.", 400);
      }
      await client.query("UPDATE users SET password_hash=$2 WHERE id=$1", [rows[0].user_id, await bcrypt.hash(p.data.password, 10)]);
      await client.query("DELETE FROM password_resets WHERE user_id=$1", [rows[0].user_id]);
      await client.query("COMMIT");
      return NextResponse.json({ ok: true });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  return fail("Not found", 404);
}
