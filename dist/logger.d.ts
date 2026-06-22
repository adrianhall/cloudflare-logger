/**
 * @file Core logger implementation for `@adrianhall/cloudflare-logger`.
 *
 * `createLogger()` constructs a `Logger` that:
 *   - Filters records below the configured level before touching context.
 *   - Merges bindings and per-call context into a new object (never mutates input).
 *   - Serializes top-level `Error` values in context before delivering to transport.
 *   - Wraps transport delivery in try/catch so transport failures never escape.
 *   - Supports child loggers that inherit transport, level, clock, and error handler.
 */
import type { CreateLoggerOptions, Logger } from "./types.js";
/**
 * Create a new `Logger` with the provided options.
 *
 * - `options.transport` is required.
 * - `options.level` defaults to `"info"`.
 * - `options.clock` defaults to `() => new Date()`.
 * - `options.bindings` are merged into every emitted record.
 * - `options.onTransportError` receives transport errors without crashing the app.
 */
export declare function createLogger(options: CreateLoggerOptions): Logger;
//# sourceMappingURL=logger.d.ts.map