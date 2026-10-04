import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { checkEligibility, getActiveOffer } from "@/lib/offer";

/** The current ₹1 first-order product, and whether THIS visitor can use it (guests never can). Display only. */
export async function GET() {
  const offer = await getActiveOffer(pool);
  const session = await getSession();
  let eligible = false;
  let reason: string | null = offer ? "guest" : "no_offer";
  if (offer && session) {
    const e = await checkEligibility(pool, session.id);
    eligible = e.eligible;
    reason = e.reason;
  }
  const res = NextResponse.json({
    offer: offer
      ? {
          productId: offer.productId, slug: offer.slug, name: offer.name, image_url: offer.image_url,
          emoji: offer.emoji, hue_a: offer.hue_a, hue_b: offer.hue_b, color: offer.colors[0] ?? null,
          normalPaise: offer.normalPaise, offerPaise: offer.offerPaise,
        }
      : null,
    signedIn: Boolean(session),
    eligible,
    reason,
  });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
