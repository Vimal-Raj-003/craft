import { pool } from "@/lib/db";

// Photos uploaded by the Super Admin, served from the database. The URL carries ?v=<timestamp>, so it can be cached for good.
export async function GET(req: Request, ctx: RouteContext<"/api/product-image/[id]">) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return new Response("Not found", { status: 404 });
  const { rows } = await pool.query("SELECT image_data, image_type FROM products WHERE id=$1 AND image_data IS NOT NULL", [id]);
  if (!rows[0]) return new Response("Not found", { status: 404 });
  const versioned = new URL(req.url).searchParams.has("v");
  return new Response(new Uint8Array(rows[0].image_data), {
    headers: {
      "Content-Type": rows[0].image_type ?? "image/webp",
      "Cache-Control": versioned ? "public, max-age=31536000, immutable" : "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
