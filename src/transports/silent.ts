/**
 * @file Silent transport for `@adrianhall/cloudflare-logger`.
 *
 * `createSilentTransport()` discards every record without emitting anything
 * to the console and without throwing. Use it as a no-op transport in
 * contexts where logging should be fully suppressed.
 */

import type { Transport } from "../types.js";

/**
 * Create a silent transport that discards all records.
 *
 * @returns A `Transport` that does nothing.
 */
export function createSilentTransport(): Transport {
  return {
    log(): void {
      // Intentionally empty — records are dropped without side effects.
    }
  };
}
