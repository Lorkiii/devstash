import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const adapterRequire = createRequire(require.resolve("@prisma/adapter-neon"));

for (const mode of ["module", "commonjs"] as const) {
  test(`Neon ${mode} decodes database bytes without deprecated Buffer construction`, () => {
    assert.equal(require.resolve("@neondatabase/serverless"), adapterRequire.resolve("@neondatabase/serverless"));

    // A fresh process makes dependency deprecations fatal without opening a database connection.
    const script = `
      ${mode === "module"
        ? 'import assert from "node:assert/strict"; import { types } from "@neondatabase/serverless";'
        : 'const assert = require("node:assert/strict"); const { types } = require("@neondatabase/serverless");'}
      const expected = Buffer.from(Array.from({ length: 256 }, (_, index) => index));
      const slash = String.fromCharCode(92);
      const parse = types.getTypeParser(17, "text");
      const fixtures = [
        [slash + "x" + expected.toString("hex"), expected],
        [Array.from(expected, value => slash + value.toString(8).padStart(3, "0")).join(""), expected],
        [slash + "x", Buffer.alloc(0)],
        ["devstash", Buffer.from("devstash")],
      ];
      for (const [input, output] of fixtures) assert.deepEqual(Buffer.from(parse(input)), output);
      const arrayInput = "{" + JSON.stringify(fixtures[0][0]) + ",NULL," + JSON.stringify(slash + "x") + "}";
      const arrayOutput = types.getTypeParser(1001, "text")(arrayInput);
      assert.deepEqual(arrayOutput.map(value => value === null ? null : Buffer.from(value)),
        [expected, null, Buffer.alloc(0)]);
    `;
    const result = spawnSync(process.execPath, [
      "--pending-deprecation", "--throw-deprecation", `--input-type=${mode}`, "-e", script,
    ], { encoding: "utf8", timeout: 10_000 });

    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
  });
}
