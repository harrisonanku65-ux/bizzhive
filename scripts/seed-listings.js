/**
 * Seeds a handful of demo courses and products under one real seller
 * account, so the live site isn't showing empty listing grids. Requires
 * categories to already exist (run scripts/seed.js first) and the target
 * account to already be signed up as a seller (so it has a vendorId).
 *
 * Idempotent: courses/products are matched on slug, so re-running updates
 * existing rows rather than creating duplicates. Safe to run against an
 * existing database.
 *
 * Usage: node scripts/seed-listings.js <sellerEmail>
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

// Load .env the same way scripts/db-push.js does, so this works on Windows
// without exporting environment variables first.
if (!process.env.DATABASE_URL) {
  try {
    const envText = readFileSync(path.join(rootDir, ".env"), "utf8");
    for (const line of envText.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // no .env — fall through to the check below
  }
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Copy env.example to .env first.");
  process.exit(1);
}

const sellerEmail = process.argv[2];
if (!sellerEmail) {
  console.error("Usage: node scripts/seed-listings.js <sellerEmail>");
  process.exit(1);
}

const COURSES = [
  { title: "Web Development Bootcamp", slug: "web-development-bootcamp", description: "Go from zero to a deployed full-stack app: HTML, CSS, JavaScript, and a modern framework.", price: 250, level: "beginner", duration: "6 weeks", categorySlug: "tech-services" },
  { title: "Advanced React & TypeScript", slug: "advanced-react-typescript", description: "Component patterns, state management, and shipping production-grade React apps.", price: 350, level: "advanced", duration: "4 weeks", categorySlug: "tech-services" },
  { title: "Music Production Fundamentals", slug: "music-production-fundamentals", description: "Learn beat-making, mixing basics, and how to get your sound heard.", price: 220, level: "beginner", duration: "5 weeks", categorySlug: "online-courses" },
  { title: "Business Coaching Fundamentals", slug: "business-coaching-fundamentals", description: "One-on-one and group sessions covering strategy, pricing, and growth.", price: 300, level: "beginner", duration: "8 sessions", categorySlug: "coaching-mentorship" },
  { title: "Public Speaking & Pitching", slug: "public-speaking-pitching", description: "Build the confidence and structure to pitch investors, customers, or a room.", price: 180, level: "intermediate", duration: "3 weeks", categorySlug: "coaching-mentorship" },
  { title: "Mobile Legends: Rank Up Fast", slug: "mobile-legends-rank-up-fast", description: "1-on-1 coaching to climb ranked faster — drafting, rotations, and macro play.", price: 120, level: "beginner", duration: "4 sessions", categorySlug: "gaming" },
];

// productType is constrained by the OpenAPI spec to:
// [ebook, template, software, asset, audio, other]
const PRODUCTS = [
  { title: "Afrobeat Drum Kit Vol. 1", slug: "afrobeat-drum-kit-vol-1", description: "40 royalty-free drum samples and one-shots for Afrobeat production.", price: 90, productType: "audio", categorySlug: "beats-music" },
  { title: "Trap Beat Pack — Vol. 2", slug: "trap-beat-pack-vol-2", description: "10 licensed trap instrumentals, stems included.", price: 90, productType: "audio", categorySlug: "beats-music" },
  { title: "Professional CV Template Pack", slug: "professional-cv-template-pack", description: "5 editable CV templates designed for the Ghanaian job market.", price: 45, productType: "template", categorySlug: "digital-templates" },
  { title: "Pitch Deck Template (Investor-Ready)", slug: "pitch-deck-template-investor-ready", description: "A 12-slide deck template used to raise pre-seed funding.", price: 60, productType: "template", categorySlug: "digital-templates" },
  { title: "Social Media Content Kit", slug: "social-media-content-kit", description: "50 editable post templates for Instagram and TikTok.", price: 35, productType: "template", categorySlug: "digital-templates" },
  { title: "Free Fire Diamonds Top-Up Guide", slug: "free-fire-diamonds-top-up-guide", description: "A step-by-step guide to the fastest, safest way to top up.", price: 25, productType: "ebook", categorySlug: "gaming" },
];

const { db, usersTable, categoriesTable, coursesTable, productsTable } = await import("@workspace/db");
const { eq } = await import("drizzle-orm");

const [seller] = await db.select().from(usersTable).where(eq(usersTable.email, sellerEmail.toLowerCase()));
if (!seller) {
  console.error(`No account found for ${sellerEmail}. Sign up first.`);
  process.exit(1);
}
if (!seller.vendorId) {
  console.error(`${sellerEmail} exists but has no vendor profile — did you sign up as a "Seller"?`);
  process.exit(1);
}
const vendorId = seller.vendorId;

const categoryIdBySlug = new Map();
for (const row of await db.select().from(categoriesTable)) {
  categoryIdBySlug.set(row.slug, row.id);
}

const missingCategories = [...new Set([...COURSES, ...PRODUCTS].map((r) => r.categorySlug))].filter(
  (slug) => !categoryIdBySlug.has(slug),
);
if (missingCategories.length > 0) {
  console.error(`Missing categories: ${missingCategories.join(", ")}. Run "pnpm run db:seed" first.`);
  process.exit(1);
}

let coursesCreated = 0;
let coursesUpdated = 0;

for (const { categorySlug, ...course } of COURSES) {
  const values = { ...course, vendorId, categoryId: categoryIdBySlug.get(categorySlug) };
  const [existing] = await db.select().from(coursesTable).where(eq(coursesTable.slug, course.slug));
  if (existing) {
    await db.update(coursesTable).set(values).where(eq(coursesTable.id, existing.id));
    coursesUpdated += 1;
  } else {
    await db.insert(coursesTable).values(values);
    coursesCreated += 1;
  }
}

let productsCreated = 0;
let productsUpdated = 0;

for (const { categorySlug, ...product } of PRODUCTS) {
  const values = { ...product, vendorId, categoryId: categoryIdBySlug.get(categorySlug) };
  const [existing] = await db.select().from(productsTable).where(eq(productsTable.slug, product.slug));
  if (existing) {
    await db.update(productsTable).set(values).where(eq(productsTable.id, existing.id));
    productsUpdated += 1;
  } else {
    await db.insert(productsTable).values(values);
    productsCreated += 1;
  }
}

console.log(`Seller: ${sellerEmail} (vendorId ${vendorId})`);
console.log(`Courses: ${coursesCreated} created, ${coursesUpdated} updated.`);
console.log(`Products: ${productsCreated} created, ${productsUpdated} updated.`);
process.exit(0);
