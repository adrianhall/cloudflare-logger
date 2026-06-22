/**
 * @file Structured transport for `@adrianhall/cloudflare-logger`.
 *
 * `createStructuredTransport()` emits records as structured payloads intended
 * for Cloudflare Workers Logs. Workers Logs automatically extracts and indexes
 * fields from JSON object logs, so this transport defaults to object logging
 * (`stringify: false`) rather than string logging.
 *
 * Payload shape: `{ time, level, message, ...context }`
 * Reserved keys (`time`, `level`, `message`) from the record take precedence
 * over identically named context keys.
 *
 * Level-to-method mapping:
 *   trace, debug → console.debug
 *   info          → console.log
 *   warn          → console.warn
 *   error, fatal  → console.error
 */
import type { ConsoleLike } from "../internal/console.js";
import type { StructuredTransportOptions, Transport } from "../types.js";
/**
 * Create a structured transport for Cloudflare Workers Logs.
 *
 * @param options - Optional stringify flag.
 * @param _console - Injected console-like object (defaults to global `console`). Used in tests.
 * @returns A `Transport` that writes structured payloads to the console.
 */
export declare function createStructuredTransport(options?: StructuredTransportOptions, _console?: ConsoleLike): Transport;
//# sourceMappingURL=structured.d.ts.map