/**
 * check-dist.mjs
 *
 * Verifies that the current source tree builds cleanly without touching dist/.
 *
 * Builds into a temporary directory using --outDir, then removes it.
 * Exits non-zero if tsc reports any errors.
 */

import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const tmpOut = mkdtempSync(join(tmpdir(), "cloudflare-logger-dist-check-"));

try {
  execSync(`node_modules/.bin/tsc -p tsconfig.build.json --outDir "${tmpOut}"`, {
    cwd: root,
    stdio: "inherit"
  });
  console.log("check:dist passed — source builds cleanly.");
} finally {
  rmSync(tmpOut, { recursive: true, force: true });
}
