import { z } from "zod";

export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

/** Fields the Super Admin can set. Prices are integers in paise. */
export const ProductFields = z.object({
  name: z.string().trim().min(2).max(120),
  sku: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9._-]+$/, "SKU may contain letters, digits, dot, dash and underscore"),
  tagline: z.string().trim().max(160),
  description: z.string().trim().max(2000),
  pricePaise: z.number().int().min(100).max(10_000_000),
  stock: z.number().int().min(0).max(100_000),
  categorySlug: z.string().trim().min(1).max(60),
  colors: z.array(z.string().trim().min(1).max(40)).max(10),
  active: z.boolean(),
  featured: z.boolean(),
});
export type ProductFieldsInput = z.infer<typeof ProductFields>;

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
