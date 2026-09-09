import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Undefined permits offline generation; database commands require DIRECT_URL.
  datasource: { url: process.env.DIRECT_URL },
});
