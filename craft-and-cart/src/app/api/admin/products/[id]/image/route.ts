import { NextResponse } from "next/server";
import sharp from "sharp";
import { pool } from "@/lib/db";
import { getStaff } from "@/lib/auth";
import { fail, sameOrigin } from "@/lib/http";
import { MAX_IMAGE_BYTES } from "@/lib/admin-products";

/**
 * Super Admin uploads a product photo (raw image bytes in the request body: JPEG, PNG or WebP, up to 5 MB).
 * It is validated by decoding it, resized to 1200x1200 and stored as WebP in the database (no extra Docker volume).
 */
export async function POST(req: Request, ctx: RouteContext<"/api/admin/products/[id]/image">) {
  if (!sameOrigin(req)) return fail("Forbidden", 403);
  if (!(await getStaff())) return fail("Forbidden", 403);
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return fail("Not found", 404);

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_IMAGE_BYTES) return fail("Image is larger than 5 MB", 413);
  const input = Buffer.from(await req.arrayBuffer());
  if (!input.length) return fail("No image received");
  if (input.length > MAX_IMAGE_BYTES) return fail("Image is larger than 5 MB", 413);

  let out: Buffer;
  try {
    const meta = await sharp(input).metadata();
    if (!meta.format || !["jpeg", "png", "webp"].includes(meta.format)) return fail("Please upload a JPEG, PNG or WebP photo");
    if ((meta.width ?? 0) < 300 || (meta.height ?? 0) < 300) return fail("The photo is too small (at least 300 × 300 pixels)");
    out = await sharp(input).rotate().resize(1200, 1200, { fit: "cover", position: "centre" }).webp({ quality: 82 }).toBuffer();
  } catch {
    return fail("That file could not be read as an image");
  }

  const url = `/api/product-image/${id}?v=${Date.now()}`;
  const r = await pool.query("UPDATE products SET image_data=$2, image_type='image/webp', image_url=$3 WHERE id=$1", [id, out, url]);
  return r.rowCount ? NextResponse.json({ ok: true, url }) : fail("Product not found", 404);
}
