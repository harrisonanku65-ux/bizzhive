/**
 * Seeds a handful of demo vendors, courses and products so the live site
 * isn't showing empty listing grids. Requires categories to already exist
 * (run scripts/seed.js first).
 *
 * Idempotent: vendors/courses/products are matched on slug, so re-running
 * updates existing rows rather than creating duplicates. Safe to run
 * against an existing database.
 *
 * Usage: node scripts/seed-listings.js
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

const VENDORS = [
  { name: "Ama Boateng", slug: "ama-boateng", bio: "Full-stack web developer and design mentor based in Accra.", location: "Accra, Ghana", email: "ama.boateng@example.com" },
  { name: "Kwame Studios", slug: "kwame-studios", bio: "Producer and sound engineer making beats for Ghana's next generation of artists.", location: "Kumasi, Ghana", email: "kwame.studios@example.com" },
  { name: "Efua Mensah", slug: "efua-mensah", bio: "Business coach helping founders sharpen their pitch and their numbers.", location: "Accra, Ghana", email: "efua.mensah@example.com" },
  { name: "Kofi Asante", slug: "kofi-asante", bio: "Top-ranked Mobile Legends player and gaming coach.", location: "Tema, Ghana", email: "kofi.asante@example.com" },
];

const COURSES = [
  { title: "Web Development Bootcamp", slug: "web-development-bootcamp", description: "Go from zero to a deployed full-stack app: HTML, CSS, JavaScript, and a modern framework.", price: 250, level: "beginner", duration: "6 weeks", vendorSlug: "ama-boateng", categorySlug: "tech-services" },
  { title: "Advanced React & TypeScript", slug: "advanced-react-typescript", description: "Component patterns, state management, and shipping production-grade React apps.", price: 350, level: "advanced", duration: "4 weeks", vendorSlug: "ama-boateng", categorySlug: "tech-services" },
  { title: "Music Production Fundamentals", slug: "music-production-fundamentals", description: "Learn beat-making, mixing basics, and how to get your sound heard.", price: 220, level: "beginner", duration: "5 weeks", vendorSlug: "kwame-studios", categorySlug: "online-courses" },
  { title: "Business Coaching Fundamentals", slug: "business-coaching-fundamentals", description: "One-on-one and group sessions covering strategy, pricing, and growth.", price: 300, level: "beginner", duration: "8 sessions", vendorSlug: "efua-mensah", categorySlug: "coaching-mentorship" },
  { title: "Public Speaking & Pitching", slug: "public-speaking-pitching", description: "Build the confidence and structure to pitch investors, customers, or a room.", price: 180, level: "intermediate", duration: "3 weeks", vendorSlug: "efua-mensah", categorySlug: "coaching-mentorship" },
  { title: "Mobile Legends: Rank Up Fast", slug: "mobile-legends-rank-up-fast", description: "1-on-1 coaching to climb ranked faster — drafting, rotations, and macro play.", price: 120, level: "beginner", duration: "4 sessions", vendorSlug: "kofi-asante", categorySlug: "gaming" },
];

const PRODUCTS = [
  { title: "Afrobeat Drum Kit Vol. 1", slug: "afrobeat-drum-kit-vol-1", description: "40 royalty-free drum samples and one-shots for Afrobeat production.", price: 90, productType: "beat", vendorSlug: "kwame-studios", categorySlug: "beats-music" },
  { title: "Trap Beat Pack — Vol. 2", slug: "trap-beat-pack-vol-2", description: "10 licensed trap instrumentals, stems included.", price: 90, productType: "beat", vendorSlug: "kwame-studios", categorySlug: "beats-music" },
  { title: "Professional CV Template Pack", slug: "professional-cv-template-pack", description: "5 editable CV templates designed for the Ghanaian job market.", price: 45, productType: "template", vendorSlug: "ama-boateng", categorySlug: "digital-templates" },
  { title: "Pitch Deck Template (Investor-Ready)", slug: "pitch-deck-template-investor-ready", description: "A 12-slide deck template used to raise pre-seed funding.", price: 60, productType: "template", vendorSlug: "efua-mensah", categorySlug: "digital-templates" },
  { title: "Social Media Content Kit", slug: "social-media-content-kit", description: "50 editable post templates for Instagram and TikTok.", price: 35, productType: "template", vendorSlug: "ama-boateng", categorySlug: "digital-templates" },
  { title: "Free Fire Diamonds Top-Up Guide", slug: "free-fire-diamonds-top-up-guide", description: "A step-by-step guide to the fastest, safest way to top up.", price: 25, productType: "guide", vendorSlug: "kofi-asante", categorySlug: "gaming" },
];

const { db, vendorsTable, categoriesTable, coursesTable, productsTable } = await import("@workspace/db");
const { eq } = await import("drizzle-orm");

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

let vendorsCreated = 0;
let vendorsUpdated = 0;
const vendorIdBySlug = new Map();

for (const vendor of VENDORS) {
  const [existing] = await db.select().from(vendorsTable).where(eq(vendorsTable.slug, vendor.slug));
  if (existing) {
    await db.update(vendorsTable).set(vendor).where(eq(vendorsTable.id, existing.id));
    vendorIdBySlug.set(vendor.slug, existing.id);
    vendorsUpdated += 1;
  } else {
    const [inserted] = await db.insert(vendorsTable).values(vendor).returning({ id: vendorsTable.id });
    vendorIdBySlug.set(vendor.slug, inserted.id);
    vendorsCreated += 1;
  }
}

let coursesCreated = 0;
let coursesUpdated = 0;

for (const { vendorSlug, categorySlug, ...course } of COURSES) {
  const values = {
    ...course,
    vendorId: vendorIdBySlug.get(vendorSlug),
    categoryId: categoryIdBySlug.get(categorySlug),
  };
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

for (const { vendorSlug, categorySlug, ...product } of PRODUCTS) {
  const values = {
    ...product,
    vendorId: vendorIdBySlug.get(vendorSlug),
    categoryId: categoryIdBySlug.get(categorySlug),
  };
  const [existing] = await db.select().from(productsTable).where(eq(productsTable.slug, product.slug));
  if (existing) {
    await db.update(productsTable).set(values).where(eq(productsTable.id, existing.id));
    productsUpdated += 1;
  } else {
    await db.insert(productsTable).values(values);
    productsCreated += 1;
  }
}

console.log(`Vendors: ${vendorsCreated} created, ${vendorsUpdated} updated.`);
console.log(`Courses: ${coursesCreated} created, ${coursesUpdated} updated.`);
console.log(`Products: ${productsCreated} created, ${productsUpdated} updated.`);
process.exit(0);
