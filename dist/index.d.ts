/**
 * @file Core entry point for `@adrianhall/cloudflare-logger`.
 *
 * Exports are added incrementally across implementation phases as described in
 * `docs/ENG_SPEC.md`. Phase 2 adds public types; Phase 3 adds the logger engine
 * and error serialization; Phase 4 adds internal formatting helpers (not
 * exported); Phase 5 adds built-in transports.
 *
 * React exports live exclusively under `@adrianhall/cloudflare-logger/react`.
 * This entry point must never import React.
 */
export { createLogger } from "./logger.js";
export { resolveLoggerConfig } from "./resolve.js";
export { serializeError } from "./serialize.js";
export { createBrowserTransport } from "./transports/browser.js";
export { createCaptureTransport } from "./transports/capture.js";
export { combineTransports } from "./transports/combine.js";
export { createConsoleTransport } from "./transports/console.js";
export { createSilentTransport } from "./transports/silent.js";
export { createStructuredTransport } from "./transports/structured.js";
export type { BrowserTransportOptions, CaptureTransport, ConsoleTransportOptions, CreateLoggerOptions, Environment, Logger, LogContext, LogLevel, LogRecord, ResolvedLoggerConfig, Runtime, StructuredTransportOptions, Transport, TransportErrorHandler } from "./types.js";
//# sourceMappingURL=index.d.ts.map