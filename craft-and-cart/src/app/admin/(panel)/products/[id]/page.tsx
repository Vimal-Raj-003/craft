import Link from "next/link";
import { notFound } from "next/navigation";
import { pool, listCategories } from "@/lib/db";
import ProductForm from "@/components/ProductForm";

export default async function EditProduct({ params }: PageProps<"/admin/products/[id]">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [{ rows }, categories] = await Promise.all([
    pool.query(
      `SELECT p.id, p.sku, p.name, p.tagline, p.description, p.price_paise, p.stock, p.colors, p.active, p.featured, p.image_url, c.slug AS category_slug
         FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.id=$1`,
      [id],
    ),
    listCategories(),
  ]);
  const p = rows[0];
  if (!p) notFound();
  return (
    <>
      <Link href="/admin/products" className="mb-4 inline-block py-2 text-sm text-dim hover:text-ink">← All products</Link>
      <h2 className="mb-4 text-2xl font-bold">{p.name}</h2>
      <ProductForm
        categories={categories}
        initial={{
          id: p.id, name: p.name, sku: p.sku ?? "", tagline: p.tagline, description: p.description,
          priceRupees: String(p.price_paise / 100), stock: String(p.stock), categorySlug: p.category_slug ?? categories[0]?.slug ?? "",
          colors: (p.colors as string[]).join(", "), active: p.active, featured: p.featured, imageUrl: p.image_url,
        }}
      />
    </>
  );
}
