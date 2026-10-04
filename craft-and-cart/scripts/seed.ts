import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL ?? "postgres://craftcart:craftcart_local@localhost:54329/craftcart";
// Anything that is not this PC is treated as a live database: stricter rules, no demo data.
const isRemote = !/@(localhost|127\.0\.0\.1)[:/]/.test(url);

const categories = [
  ["bouquets", "Bouquets", "Everlasting crochet blooms that never wilt."],
  ["keychains", "Keychains", "Pocket-sized charms for keys and bags."],
  ["accessories", "Accessories", "Jhumkas, gajra, scrunchies and pouches."],
  ["amigurumi", "Amigurumi", "Tiny stitched friends from the South."],
] as const;

type P = [string, string, string, string, number, string, number, string[], string, string, string, boolean, string?];
const products: P[] = [
  // Bouquets
  ["pearl-tulip-bouquet", "Pearl Tulip Bouquet", "Ivory tulips tied with a blush ribbon", "Five hand-crocheted tulips in creamy ivory cotton with textured petals, leafy green stems and a satin ribbon bow. A bouquet that stays perfect forever — ideal for weddings, anniversaries and housewarmings.", 159900, "bouquets", 12, ["Ivory White", "Blush Pink"], "#fdf6e3", "#9fb88a", "🌷", true, "/products/white-tulip-bouquet.jpg"],
  ["kanchi-rose-bouquet", "Kanchi Rose Bouquet", "Silk-red roses with a gold border", "Seven hand-crocheted roses in kumkum red with zari-gold edging, wrapped in a handloom-style cotton sleeve. Lasts forever, no watering needed. About 30cm tall.", 149900, "bouquets", 10, ["Kumkum Red", "Temple Gold", "Jasmine White"], "#e8334f", "#7a1d00", "💐", true],
  ["surya-sunflower-bouquet", "Surya Sunflower Bouquet", "A little sunshine, Pongal-bright", "Five cheerful sunflowers with brown-eyed centres and leafy stems. A perfect festival or birthday gift.", 119900, "bouquets", 14, ["Sunflower Yellow", "Marigold Orange"], "#ffd166", "#e07a00", "🌻", true],
  ["temple-lotus-bouquet", "Temple Lotus Bouquet", "Lotus blooms, straight from the gopuram", "Three layered lotus flowers in blush pink with emerald leaves — inspired by temple tank lotuses.", 169900, "bouquets", 8, ["Blush Pink", "Pure White"], "#ff9ab0", "#19806a", "🪷", true],
  ["marigold-mala-bouquet", "Marigold Mala Bouquet", "Genda phool, festival-ready", "A fluffy marigold bunch in saffron and gold. Beautiful on a puja shelf or as a Diwali gift.", 99900, "bouquets", 20, ["Saffron", "Golden Yellow"], "#ffb347", "#d35400", "🌼", false],
  // Keychains
  ["surya-sunflower-keychain", "Surya Sunflower Keychain", "A little ray of happiness", "A bright hand-crocheted sunflower with a chocolate-brown centre and a green leaf, finished with a steel key ring and chain. Perfect Pongal gift or everyday mood-lifter. About 6cm.", 27900, "keychains", 55, ["Sunflower Yellow", "Marigold Orange"], "#ffd166", "#e07a00", "🌻", true, "/products/sunflower-keychain.jpg"],
  ["mallige-jasmine-keychain", "Mallige Jasmine Keychain", "A little strand of jasmine", "Tiny crocheted jasmine buds on a brass ring, with a green leaf tassel. Smells of nostalgia (not literally!).", 24900, "keychains", 60, ["Jasmine White", "Ivory"], "#fff4e0", "#19c58a", "🌸", true],
  ["gaja-elephant-keychain", "Gaja Elephant Keychain", "Temple elephant with a golden headdress", "A mini caparisoned elephant in grey cotton with tiny gold-thread decorations. About 7cm.", 34900, "keychains", 40, ["Temple Grey", "Royal Blue"], "#9aa5b1", "#f5a623", "🐘", true],
  ["mayil-peacock-keychain", "Mayil Peacock Keychain", "Peacock feather in iridescent yarn", "A peacock with a fanned tail in teal-and-gold yarn — the pride of Tamil Nadu.", 32900, "keychains", 35, ["Peacock Teal", "Royal Purple"], "#0e8f9a", "#7a2cbf", "🦚", false],
  ["filter-coffee-charm", "Filter Coffee Charm", "Davara-tumbler cutie", "A mini steel-tumbler-and-davara charm for the filter-kaapi lover. Great as a bag charm.", 29900, "keychains", 45, ["Kaapi Brown", "Steel Silver"], "#c68642", "#6b3e1d", "☕", false],
  // Accessories
  ["crochet-flower-hair-clip", "Crochet Flower Hair Clip", "A little bloom for your hair", "A hand-crocheted five-petal flower in bold red with a creamy white centre, mounted on a strong claw clip. Soft, lightweight and gentle on hair. Perfect for half-up styles, festivals and gifting. About 6cm wide.", 37900, "accessories", 30, ["Red & White", "Pink & Cream"], "#e8334f", "#f6e7d0", "🌺", true, "/products/crochet-flower-hair-clip.webp"],
  ["crochet-jhumka-earrings", "Crochet Jhumka Earrings", "Lightweight statement jhumkas", "Dome-shaped jhumkas in crochet with gold beads and surgical-steel hooks. Feather-light, all-day comfort.", 39900, "accessories", 30, ["Maroon & Gold", "Emerald & Gold", "Ivory & Gold"], "#e8334f", "#f5a623", "🔔", true],
  ["gajra-hair-accessory", "Gajra Hair Accessory", "A jasmine veni that stays fresh", "A crocheted gajra with jasmine flowers and a hidden comb. Perfect for weddings, Bharatanatyam or festivals.", 44900, "accessories", 25, ["Jasmine White", "Rose & Jasmine"], "#fff4e0", "#e8334f", "🌺", true],
  ["kolam-scrunchie-set", "Kolam Scrunchie Set", "Set of 3 patterned scrunchies", "Soft crochet scrunchies with kolam-inspired motifs in festive colours. Gentle on hair.", 29900, "accessories", 50, ["Festive Trio", "Pastel Trio"], "#f5a623", "#e8334f", "🎀", false],
  ["temple-border-pouch", "Temple Border Sling Pouch", "Kasavu-inspired mini sling bag", "A small sling pouch with a gold temple-border pattern, magnetic clasp and a cotton lining. Fits phone and keys.", 89900, "accessories", 15, ["Kasavu Cream", "Maroon"], "#fff4e0", "#c9a227", "👛", false],
  // Amigurumi
  ["gaja-amigurumi-elephant", "Gaja Amigurumi Elephant", "Soft temple elephant to cuddle", "A cuddly crocheted elephant with a gold headdress and bell. Stuffed with hypoallergenic fill. About 25cm.", 129900, "amigurumi", 12, ["Temple Grey", "Pink"], "#9aa5b1", "#e8334f", "🐘", false],
  ["idli-plush-friend", "Idli Plush Friend", "The softest breakfast", "A smiling idli on a banana-leaf mat. Silly, sweet and 100% calorie-free.", 59900, "amigurumi", 22, ["Classic White"], "#fff4e0", "#c9a227", "🍚", false],
];

async function main() {
  const pool = new Pool({ connectionString: url, ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined });
  await pool.query(fs.readFileSync(path.resolve("db/schema.sql"), "utf8"));

  // Drop the previous catalogue (order history keeps its line items; product_id becomes NULL).
  await pool.query("DELETE FROM products WHERE slug <> ALL($1)", [products.map((p) => p[0])]);

  for (const [slug, name, blurb] of categories) {
    await pool.query(
      `INSERT INTO categories(slug,name,blurb) VALUES($1,$2,$3)
       ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, blurb=EXCLUDED.blurb`,
      [slug, name, blurb],
    );
  }
  for (const [slug, name, tagline, description, price, cat, stock, colors, a, b, emoji, featured, image] of products) {
    await pool.query(
      `INSERT INTO products(slug,name,tagline,description,price_paise,category_id,stock,colors,hue_a,hue_b,emoji,featured,image_url)
       VALUES($1,$2,$3,$4,$5,(SELECT id FROM categories WHERE slug=$6),$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, tagline=EXCLUDED.tagline, description=EXCLUDED.description,
         price_paise=EXCLUDED.price_paise,${isRemote ? "" : " stock=EXCLUDED.stock,"} colors=EXCLUDED.colors, featured=EXCLUDED.featured,
         category_id=EXCLUDED.category_id, hue_a=EXCLUDED.hue_a, hue_b=EXCLUDED.hue_b, emoji=EXCLUDED.emoji, image_url=EXCLUDED.image_url`,
      [slug, name, tagline, description, price, cat, stock, colors, a, b, emoji, featured, image ?? null],
    );
  }

  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@craftandcart.local";
  const adminPass = process.env.ADMIN_PASSWORD ?? (isRemote ? "" : "admin12345");
  if (isRemote && adminPass.length < 10) {
    throw new Error("Seeding a live database: set ADMIN_PASSWORD (at least 10 characters) so the admin account is not left with a guessable password.");
  }
  await pool.query("DELETE FROM categories WHERE slug <> ALL($1)", [categories.map((c) => c[0])]);

  await pool.query(
    `INSERT INTO users(email,name,password_hash,role) VALUES($1,'Admin',$2,'SUPER_ADMIN')
     ON CONFLICT (email) DO NOTHING`,
    [adminEmail, await bcrypt.hash(adminPass, 10)],
  );

  // Sample reviews are for local demos only; a live shop must not show invented customer reviews.
  const { rows } = isRemote ? { rows: [] as { id: number }[] } : await pool.query("SELECT id FROM products WHERE NOT EXISTS (SELECT 1 FROM reviews r WHERE r.product_id=products.id)");
  const reviews = [
    ["Lakshmi, Chennai", 5, "Looks exactly like the real thing — gifted it for Varalakshmi puja and everyone asked where it's from."],
    ["Karthik, Bengaluru", 5, "Ordered for my sister's birthday. Gorgeous stitching, and it arrived beautifully packed."],
    ["Divya, Kochi", 4, "Lovely colours and so well made. Will order again for Onam!"],
  ] as const;
  for (const r of rows) {
    const rv = reviews[r.id % reviews.length];
    await pool.query("INSERT INTO reviews(product_id,author,rating,body) VALUES($1,$2,$3,$4)", [r.id, ...rv]);
  }

  console.log(`🌱 Seeded ${products.length} products. Admin: ${adminEmail}${isRemote ? "" : " / " + adminPass}`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
