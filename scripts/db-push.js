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
    // Remove surrounding quotes, if any
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
} catch (err) {
  if (err.code !== "ENOENT") {
    console.error("Failed to read .env file:", err.message);
    process.exit(1);
  }
  // No .env file; the caller is responsible for setting env vars manually.
}

const proc = spawn("pnpm", ["--filter", "@workspace/db", "run", "push"], {
  cwd: rootDir,
  stdio: "inherit",
  shell: process.platform === "win32",
});

proc.on("exit", (code) => {
  process.exit(code ?? 0);
});
