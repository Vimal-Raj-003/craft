import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { checkEligibility, getActiveOffers } from "@/lib/offer";

/** The current first-order promotional products (₹1 / ₹2) and whether THIS visitor can use them (guests never can). Display only. */
export async function GET() {
  const offers = await getActiveOffers(pool);
  const session = await getSession();
  let eligible = false;
  let reason: string | null = offers.length ? "guest" : "no_offer";
  if (offers.length && session) {
    const e = await checkEligibility(pool, session.id);
    eligible = e.eligible;
    reason = e.reason;
  }
  const res = NextResponse.json({
    offers: offers.map((o) => ({
      productId: o.productId, slot: o.slot, slug: o.slug, name: o.name, image_url: o.image_url,
      emoji: o.emoji, hue_a: o.hue_a, hue_b: o.hue_b, color: o.colors[0] ?? null,
      normalPaise: o.normalPaise, offerPaise: o.offerPaise,
    })),
    signedIn: Boolean(session),
    eligible,
    reason,
  });
  res.headers.set("Cache-Control", "no-store");
  return res;
}