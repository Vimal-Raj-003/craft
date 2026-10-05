import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { clientIp, fail, rateLimit, sameOrigin } from "@/lib/http";
import { answerChat } from "@/lib/chat";

const Body = z.object({ message: z.string().trim().min(1).max(300) });

/** Customer-support assistant. Answers only from the shop's own data (see lib/chat.ts). Nothing the customer types is stored. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Forbidden", 403);
  if (!rateLimit(`chat:${clientIp(req)}`, 30, 60_000)) return fail("You're sending messages very quickly. Please wait a moment.", 429);
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail("Please type a question (up to 300 characters).");
  const session = await getSession();
  const reply = await answerChat(p.data.message, { userId: session?.id ?? null });
  const res = NextResponse.json(reply);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
