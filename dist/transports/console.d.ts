/**
 * @file Console transport for `@adrianhall/cloudflare-logger`.
 *
 * `createConsoleTransport()` formats records as human-readable single-line
 * output intended for terminal environments including `wrangler dev`. It
 * supports optional ANSI color codes and configurable timestamp formats.
 *
 * Level-to-method mapping:
 *   trace, debug, info → console.log
 *   warn, error, fatal  → console.error
 *
 * Output format:
 *   [timestamp] LEVEL  message [{"key":"value"}]
 */
import type { ConsoleLike } from "../internal/console.js";
import type { ConsoleTransportOptions, Transport } from "../types.js";
/**
 * Extract an `HH:MM:SS` time string from an ISO 8601 timestamp.
 * Falls back to the first 8 characters if the expected `T` separator is absent.
 *
 * Exported for direct unit testing of the fallback branch.
 */
export declare function extractTime(isoString: string): string;
/**
 * Create a console transport for terminal/wrangler dev output.
 *
 * @param options - Timestamp and color options.
 * @param _console - Injected console-like object (defaults to global `console`). Used in tests.
 * @returns A `Transport` that writes formatted lines to the terminal.
 */
export declare function createConsoleTransport(options?: ConsoleTransportOptions, _console?: ConsoleLike): Transport;
//# sourceMappingURL=console.d.ts.map