/**
 * @file Capture transport for `@adrianhall/cloudflare-logger`.
 *
 * `createCaptureTransport()` accumulates log records in memory without
 * writing to the console. It is intended for use in Vitest tests where
 * assertions need to inspect emitted records deterministically.
 *
 * Use `.find(level)` as the preferred assertion helper for level-specific
 * record checks rather than filtering `.records` manually.
 */
import type { CaptureTransport } from "../types.js";
/**
 * Create a capture transport that stores records in memory.
 *
 * @returns A `CaptureTransport` with `.records`, `.clear()`, and `.find()`.
 */
export declare function createCaptureTransport(): CaptureTransport;
//# sourceMappingURL=capture.d.ts.map