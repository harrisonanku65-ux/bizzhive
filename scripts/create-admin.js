/**
 * Creates or updates a BizzHive admin account.
 *
 * Admin accounts live in their own table and are never created through public
 * signup, so this script is the only way to mint one.
 *
 * Usage:
 *   node scripts/create-admin.js admin@bizzhive.com "SomeStrongPassword" "Ada A."
 *
 * Re-running with an existing email resets that admin's password.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

// Load DATABASE_URL from .env the same way scripts/db-push.js does, so this
// works on Windows without exporting env vars first.
if (!process.env.DATABASE_URL) {
  try {
    const envFile = readFileSync(path.join(rootDir, ".env"), "utf8");
    for (const line of envFile.split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // no .env — fall through to the check below
  }
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Add it to .env in the repo root first.");
  process.exit(1);
}

const [email, password, name] = process.argv.slice(2);

if (!email || !password) {
  console.error('Usage: node scripts/create-admin.js <email> <password> ["Display Name"]');
  process.exit(1);
}

// Admin accounts are the highest-value target on the platform, so they get a
// stricter version of the policy applied to normal accounts (12 chars vs 8).
const adminPasswordProblems = [
  password.length < 12 && "be at least 12 characters",
  !/[A-Z]/.test(password) && "contain an uppercase letter",
  !/[a-z]/.test(password) && "contain a lowercase letter",
  !/[0-9]/.test(password) && "contain a number",
  !/[^A-Za-z0-9]/.test(password) && "contain a symbol",
].filter(Boolean);

if (adminPasswordProblems.length > 0) {
  console.error(`Admin password must ${adminPasswordProblems.join(", ")}.`);
  process.exit(1);
}

const { db, adminsTable } = await import("@workspace/db");
const { eq } = await import("drizzle-orm");
const bcrypt = (await import("bcryptjs")).default;

const passwordHash = await bcrypt.hash(password, 10);
const normalizedEmail = email.toLowerCase();

const [existing] = await db.select().from(adminsTable).where(eq(adminsTable.email, normalizedEmail));

if (existing) {
  await db
    .update(adminsTable)
    .set({ passwordHash, active: true, ...(name ? { name } : {}) })
    .where(eq(adminsTable.id, existing.id));
  console.log(`Updated existing admin: ${normalizedEmail}`);
} else {
  await db.insert(adminsTable).values({
    email: normalizedEmail,
    passwordHash,
    name: name ?? normalizedEmail,
  });
  console.log(`Created admin: ${normalizedEmail}`);
}

console.log("Sign in at /admin/login");
process.exit(0);
