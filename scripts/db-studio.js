/**
 * Opens Drizzle Studio — a browser GUI for the local database.
 *
 * Wraps `drizzle-kit studio` the same way db-push.js wraps `drizzle-kit push`:
 * by loading DATABASE_URL from .env first, so it works on Windows without
 * exporting environment variables by hand. (drizzle.config.ts throws if
 * DATABASE_URL is missing.)
 *
 * Usage: pnpm run db:studio
 */
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const envFile = path.join(rootDir, ".env");

try {
  const envText = readFileSync(envFile, "utf8");
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
} catch (err) {
  if (err.code !== "ENOENT") {
    console.error("Failed to read .env file:", err.message);
    process.exit(1);
  }
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Copy env.example to .env first.");
  process.exit(1);
}

const proc = spawn(
  "pnpm",
  ["--filter", "@workspace/db", "exec", "drizzle-kit", "studio", "--config", "./drizzle.config.ts"],
  { cwd: rootDir, stdio: "inherit", shell: process.platform === "win32" },
);

proc.on("exit", (code) => process.exit(code ?? 0));
