import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const failures = [];

const envExample = read(".env.example");
const requiredKeys = [
  "AUTH_URL",
  "AUTH_SECRET",
  "AUTH_GOOGLE_CLIENT_ID",
  "AUTH_GOOGLE_CLIENT_SECRET",
  "DATABASE_URL",
  "DIRECT_URL",
  "DEVSTASH_CSP_MODE",
];
for (const key of requiredKeys) {
  if (!new RegExp(`^${key}=`, "m").test(envExample)) failures.push(`.env.example is missing ${key}`);
}
if (/^NEXT_PUBLIC_(?:AUTH|DATABASE|DIRECT|GOOGLE)/m.test(envExample)) {
  failures.push(".env.example exposes a server-only value through NEXT_PUBLIC_");
}
if (!/^DEVSTASH_CSP_MODE=report-only$/m.test(envExample)) {
  failures.push(".env.example must keep CSP report-only until production browser review");
}

const prismaConfig = read("prisma.config.ts");
const prismaRuntime = read("app/lib/prisma.ts");
if (!/process\.env\.DIRECT_URL/.test(prismaConfig)) failures.push("Prisma CLI is not bound to DIRECT_URL");
if (!/databaseUrl/.test(prismaRuntime)) failures.push("runtime Prisma adapter wiring changed unexpectedly");

const packageLock = JSON.parse(read("package-lock.json"));
if (packageLock.lockfileVersion !== 3) failures.push("package-lock.json must remain lockfile version 3");
if (!fs.existsSync(path.join(root, "prisma", "migrations", "migration_lock.toml"))) {
  failures.push("Prisma migration lock file is missing");
}

const origin = process.env.DEVSTASH_DEPLOYMENT_ORIGIN;
if (origin) {
  let parsed;
  try { parsed = new URL(origin); } catch { parsed = null; }
  if (!parsed || parsed.protocol !== "https:" || parsed.pathname !== "/") {
    failures.push("DEVSTASH_DEPLOYMENT_ORIGIN must be an HTTPS origin without a path");
  }
  if (parsed) {
    const callback = `${parsed.origin}/api/auth/callback/google`;
    if (!read("README.md").includes(callback)) {
      console.log(`Reminder: register ${callback} in Google OAuth before launch.`);
    }
  }
}

if (failures.length) {
  console.error("Deployment readiness: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("Deployment readiness: PASS (offline repository checks only)");
  console.log("No environment values, network calls, migrations, or deployment actions were performed.");
}
