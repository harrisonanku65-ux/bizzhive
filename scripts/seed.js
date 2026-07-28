/**
 * Seeds the categories advertised on bizzhivegh.com.
 *
 * Courses, products and session slots all require a `categoryId`, and there is
 * no public endpoint to create categories — so a freshly pushed database can't
 * have anything listed on it until this runs.
 *
 * Idempotent: matches on slug, so re-running updates names/icons rather than
 * creating duplicates. Safe to run against an existing database.
 *
 * Usage: node scripts/seed.js
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

const CATEGORIES = [
  {
    name: "Online Courses",
    slug: "online-courses",
    description: "Learn skills from Ghana's best creators teaching what they know best.",
    icon: "BookOpen",
  },
  {
    name: "Coaching & Mentorship",
    slug: "coaching-mentorship",
    description: "Book one-on-one sessions with business, fitness and academic coaches.",
    icon: "Users",
  },
  {
    name: "Beats & Music",
    slug: "beats-music",
    description: "License beats and audio productions directly from local artists.",
    icon: "Music",
  },
  {
    name: "Tech Services",
    slug: "tech-services",
    description: "Hire web designers, developers and IT professionals for your projects.",
    icon: "Code",
  },
  {
    name: "Digital Templates",
    slug: "digital-templates",
    description: "Download ready-made CVs, pitch decks, social media kits and more.",
    icon: "FileText",
  },
  {
    name: "Consultation Calls",
    slug: "consultation-calls",
    description: "Book expert advice sessions on business, law, finance and beyond.",
    icon: "Phone",
  },
  {
    // Slug must stay "gaming" — the Gaming Hub page looks it up by this slug.
    name: "Gaming Hub",
    slug: "gaming",
    description: "Top-ups, coaching, guides and gaming services from the best players.",
    icon: "Gamepad2",
  },
];

const { db, categoriesTable } = await import("@workspace/db");
const { eq } = await import("drizzle-orm");

let created = 0;
let updated = 0;

for (const category of CATEGORIES) {
  const [existing] = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.slug, category.slug));

  if (existing) {
    await db
      .update(categoriesTable)
      .set({
        name: category.name,
        description: category.description,
        icon: category.icon,
      })
      .where(eq(categoriesTable.id, existing.id));
    updated += 1;
  } else {
    await db.insert(categoriesTable).values(category);
    created += 1;
  }
}

console.log(`Categories seeded — ${created} created, ${updated} updated.`);
process.exit(0);
