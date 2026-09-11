import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";

const host = "127.0.0.1";
const port = 4174;
const outputDirectory = resolve("node_modules/.cache/devstash-vault-crypto-proof");
const htmlPath = resolve("tests/browser/vault-crypto-proof.html");
const contentSecurityPolicy = [
  "default-src 'none'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "worker-src 'self'",
  "connect-src 'self'",
  "style-src 'none'",
  "img-src 'none'",
  "font-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join("; ");

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
]);

createServer(async (request, response) => {
  const pathname = new URL(request.url ?? "/", `http://${host}:${port}`).pathname;
  if (request.method === "POST" && pathname === "/result") {
    const chunks = [];
    let receivedBytes = 0;
    for await (const chunk of request) {
      receivedBytes += chunk.length;
      if (receivedBytes > 4_096) {
        response.writeHead(413).end();
        return;
      }
      chunks.push(chunk);
    }
    console.log(`BROWSER_PROOF_RESULT ${Buffer.concat(chunks).toString("utf8")}`);
    response.writeHead(204, { "Cache-Control": "no-store" }).end();
    return;
  }
  const requestedPath = pathname === "/" ? htmlPath : resolve(outputDirectory, `.${pathname}`);
  const isProofAsset = requestedPath.startsWith(`${outputDirectory}${sep}`);
  if (requestedPath !== htmlPath && !isProofAsset) {
    response.writeHead(404).end();
    return;
  }

  try {
    const file = await stat(requestedPath);
    if (!file.isFile()) throw new Error("Not a file");
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Security-Policy": contentSecurityPolicy,
      "Content-Type": contentTypes.get(extname(requestedPath)) ?? "application/octet-stream",
      "Cross-Origin-Resource-Policy": "same-origin",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
    });
    createReadStream(requestedPath).pipe(response);
  } catch {
    response.writeHead(404).end();
  }
}).listen(port, host, () => {
  console.log(`Vault cryptography browser proof: http://${host}:${port}`);
});
