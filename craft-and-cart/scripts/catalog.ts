import fs from "node:fs";
import path from "node:path";
import type { Pool } from "pg";

// The second batch of 15 handmade crochet products. INSERT-ONLY: existing products (and anything the Super Admin has
// edited) are never changed or deleted. A product whose photo file is missing is added as INACTIVE with no image.
//
// [slug, sku, name, tagline, description, price in rupees, category, stock, colours, featured, active-when-photo-exists]
type Item = [string, string, string, string, string, number, string, number, string[], boolean, boolean];

export const CATALOG: Item[] = [
  ["crochet-teddy-bear", "CC-TEDDY", "Crochet Teddy Bear", "A cuddly bear in a hand-crocheted sweater", "A soft amigurumi teddy bear crocheted in cotton-blend yarn, wearing its own little sweater. Safe stuffing, embroidered features and a sturdy finish. A gift for babies, birthdays and anyone who needs a hug. Each piece is made to order, so colours and details may vary slightly.", 899, "amigurumi", 15, ["Brown & Rose", "Cream"], true, true],
  ["crochet-bunny", "CC-BUNNY", "Crochet Bunny", "A sleepy-eared amigurumi bunny", "A hand-crocheted bunny with long soft ears and a gentle face, stuffed with hypoallergenic fill. Lovely for nurseries, Easter and birthdays. Made to order; small differences in shaping are the mark of handwork.", 699, "amigurumi", 15, ["Cream", "Blush Pink"], false, true],
  ["crochet-flower-bouquet", "CC-FLOWERS", "Crochet Flower Bouquet", "Everlasting crochet blooms that never wilt", "A mixed bunch of hand-crocheted flowers — daisy, sunflower, rose and lavender — on wire stems. No watering, no wilting, and it looks as good in a vase next year as it does today. Made to order; flower mix may vary a little.", 799, "bouquets", 12, ["Mixed Pastels", "Sunny Yellow"], true, true],
  ["strawberry-crochet-keychain", "CC-STRAW", "Strawberry Crochet Keychain", "A plump little strawberry for your keys", "A hand-crocheted strawberry in bright red with a green leaf cap, finished as a keychain with a metal ring. Light, cheerful and perfect for keys, bags and gifting. About 5 cm. Made to order, so small differences in stitching are expected.", 199, "keychains", 30, ["Strawberry Red"], true, true],
  ["crochet-baby-booties", "CC-BOOTIE", "Crochet Baby Booties", "Soft first shoes with drawstring ties", "A pair of hand-crocheted baby booties in soft yarn with drawstring ties to keep them on tiny feet. A classic baby-shower and newborn gift. Made to order; colours can be matched on request.", 449, "accessories", 20, ["Sky Blue & White", "Pink & White"], false, true],
  ["crochet-handbag", "CC-BAG", "Crochet Handbag", "A granny-square statement bag", "A roomy hand-crocheted handbag made of colourful granny squares, with sturdy straps and a framed opening. Light to carry and a talking point wherever it goes. Made to order; the colour mix will vary from piece to piece.", 1499, "accessories", 8, ["Multicolour"], true, true],
  ["single-crochet-sunflower", "CC-SUNFLOWER", "Single Crochet Sunflower", "One bright sunflower on a stem", "A single hand-crocheted sunflower on a bendable stem — perfect for a desk, a vase or a pot plant. Cheerful, lasting and a lovely small gift. About 30 cm tall. Made to order.", 249, "bouquets", 30, ["Sunflower Yellow"], false, true],
  ["crochet-doll", "CC-DOLL", "Crochet Doll", "An amigurumi doll with a stitched outfit", "A hand-crocheted amigurumi doll with yarn hair and a stitched outfit, stuffed with hypoallergenic fill. About 25 cm tall. Made to order; hair and outfit colours can vary.", 999, "amigurumi", 10, ["Orange Hair", "Brown Hair"], true, true],
  ["crochet-coaster-set", "CC-COASTER", "Crochet Coasters (Set of 2)", "Round cotton coasters for your table", "Two hand-crocheted round coasters in sturdy cotton yarn. Protect your table and brighten your tea time. Machine-washable on a gentle cycle. About 10 cm across. Made to order.", 249, "home", 25, ["Blue & White"], false, true],
  ["crochet-plant-pot-cover", "CC-POTCOVER", "Crochet Plant Pot Cover", "A cosy sleeve for a plain plant pot", "A hand-crocheted pot cover that turns a plain plastic pot into a decorative planter. Fits pots about 12–14 cm wide. Made to order.", 399, "home", 20, ["Cream", "Sage Green"], false, true],
  ["crochet-scrunchie", "CC-SCRUNCHIE", "Crochet Scrunchie", "A soft, gentle hair tie", "A hand-crocheted scrunchie with a stretchy core, gentle on hair and long-lasting. Made to order in your choice of colour.", 149, "accessories", 40, ["Sage Green", "Blush Pink", "Cream"], false, true],
  ["crochet-heart-gift", "CC-HEART", "Crochet Heart Gift", "A little crocheted heart, made with love", "A hand-crocheted heart in soft pastel yarn — a small gift for Valentine's, anniversaries, thank-yous or simply because. About 8 cm. Made to order.", 349, "home", 25, ["Pastel Mix"], false, true],
  ["mini-crochet-chick", "CC-CHICK", "Mini Crochet Chick", "A tiny amigurumi chick in a little outfit", "A small hand-crocheted chick with an orange beak and feet, dressed in a tiny stitched outfit. A sweet gift and a shelf friend. About 12 cm. Made to order; outfit colours may vary.", 449, "amigurumi", 20, ["Yellow"], false, true],
  ["crochet-coin-pouch", "CC-POUCH", "Crochet Coin Pouch", "A pocket-sized zip-free pouch with a button", "A small hand-crocheted pouch with a button closure — just right for coins, earphones, lip balm or keys. About 10 cm wide. Made to order; colours can be matched on request.", 299, "accessories", 20, ["Blue & White"], false, true],
  ["decorative-crochet-basket", "CC-BASKET", "Decorative Crochet Basket", "Handy cotton baskets for shelves and desks", "Hand-crocheted storage baskets in thick cotton yarn with a folded rim. Use them for small essentials on a shelf, desk or bathroom counter. About 12 cm tall. Made to order.", 799, "home", 10, ["White", "Cream"], false, false],
];

/** Adds any missing products and (only if no offer has ever been configured) makes the strawberry keychain the ₹1 product. */
export async function addCatalog(pool: Pool) {
  await pool.query("INSERT INTO categories(slug,name,blurb) VALUES ('home','Home','Cosy crochet for your home.') ON CONFLICT (slug) DO NOTHING");
  let added = 0;
  for (const [slug, sku, name, tagline, description, rupees, cat, stock, colors, featured, active] of CATALOG) {
    const hasPhoto = fs.existsSync(path.resolve("public/products", `${slug}.webp`));
    const r = await pool.query(
      `INSERT INTO products(slug,sku,name,tagline,description,price_paise,category_id,stock,colors,featured,active,image_url)
       VALUES($1,$2,$3,$4,$5,$6,(SELECT id FROM categories WHERE slug=$7),$8,$9,$10,$11,$12)
       ON CONFLICT DO NOTHING`,
      [slug, sku, name, tagline, description, rupees * 100, cat, stock, colors, featured, active && hasPhoto, hasPhoto ? `/products/${slug}.webp` : null],
    );
    added += r.rowCount ?? 0;
  }
  const none = await pool.query("SELECT 1 FROM first_order_offer LIMIT 1");
  if (!none.rowCount) {
    await pool.query(
      "INSERT INTO first_order_offer(product_id, offer_price_paise, active) SELECT id, 100, true FROM products WHERE slug='strawberry-crochet-keychain'",
    );
  }
  return added;
}
