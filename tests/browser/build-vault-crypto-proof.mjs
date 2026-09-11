import { build } from "esbuild";
import { resolve } from "node:path";

const outputDirectory = resolve("node_modules/.cache/devstash-vault-crypto-proof");

await build({
  entryPoints: {
    "vault-crypto-proof": resolve("tests/browser/vault-crypto-proof.entry.ts"),
    "vault-crypto.worker": resolve("app/lib/vault-crypto/vault-crypto.worker.ts"),
  },
  absWorkingDir: process.cwd(),
  bundle: true,
  entryNames: "[name]",
  chunkNames: "chunks/[name]-[hash]",
  splitting: true,
  format: "esm",
  platform: "browser",
  target: ["chrome111", "edge111", "firefox111", "safari16.4"],
  outdir: outputDirectory,
  outExtension: { ".js": ".js" },
  metafile: true,
  legalComments: "none",
  sourcemap: false,
  write: true,
});

console.log(`Built vault cryptography browser proof in ${outputDirectory}`);
