import { NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { fail, sameOrigin } from "@/lib/http";
import { computeQuote } from "@/lib/offer";

const Body = z.object({
  paymentMethod: z.enum(["online", "cod"]),
  phone: z.string().max(20).optional(),
  items: z
    .array(z.object({ productId: z.number().int().positive(), qty: z.number().int().min(1).max(20), color: z.string().max(50).optional() }))
    .min(1)
    .max(50),
});

/** What the cart costs, as the SERVER would charge it (including the first-order offer). Display only: nothing is saved. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Forbidden", 403);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Invalid request");
  const session = await getSession();
  const q = await computeQuote(pool, { userId: session?.id ?? null, method: parsed.data.paymentMethod, items: parsed.data.items, phone: parsed.data.phone });
  if (!q.ok) return fail(q.error, q.status);
  const res = NextResponse.json({
    lines: q.lines,
    subtotal: q.subtotal,
    discount: q.discount,
    shipping: q.shipping,
    shippingFree: q.shippingFree,
    total: q.total,
    offer: q.offer,
    signedIn: Boolean(session),
  });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
