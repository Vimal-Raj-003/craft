import { NextResponse } from "next/server";
import { listProducts } from "@/lib/db";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const products = await listProducts({
    category: sp.get("category") ?? undefined,
    q: sp.get("q") ?? undefined,
    sort: sp.get("sort") ?? undefined,
    featured: sp.get("featured") === "1",
  });
  return NextResponse.json({ products });
}
