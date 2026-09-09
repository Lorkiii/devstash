import { registerHooks } from "node:module";

// Node tests execute server modules outside Next's bundler. Preserve normal
// React exports while replacing only the server-only build guard for this runner.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { url: new URL("../node_modules/server-only/empty.js", import.meta.url).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
