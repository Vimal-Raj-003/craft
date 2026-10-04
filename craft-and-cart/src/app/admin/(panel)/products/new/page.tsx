import Link from "next/link";
import { listCategories } from "@/lib/db";
import ProductForm from "@/components/ProductForm";

export default async function NewProduct() {
  const categories = await listCategories();
  return (
    <>
      <Link href="/admin/products" className="mb-4 inline-block py-2 text-sm text-dim hover:text-ink">← All products</Link>
      <h2 className="mb-4 text-2xl font-bold">Add a product</h2>
      <ProductForm
        categories={categories}
        initial={{ name: "", sku: "", tagline: "", description: "", priceRupees: "", stock: "10", categorySlug: categories[0]?.slug ?? "", colors: "", active: false, featured: false, imageUrl: null }}
      />
    </>
  );
}
