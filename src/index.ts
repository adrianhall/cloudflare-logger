/**
 * @file Core entry point for `@adrianhall/cloudflare-logger`.
 *
 * Exports are added incrementally across implementation phases as described in
 * `docs/ENG_SPEC.md`. Phase 2 adds public types; Phase 3 adds the logger engine
 * and error serialization; later phases add transports and config helpers.
 *
 * React exports live exclusively under `@adrianhall/cloudflare-logger/react`.
 * This entry point must never import React.
 */

export { createLogger } from "./logger.js";
export { serializeError } from "./serialize.js";

export type {
  BrowserTransportOptions,
  CaptureTransport,
  ConsoleTransportOptions,
  CreateLoggerOptions,
  Environment,
  Logger,
  LogContext,
  LogLevel,
  LogRecord,
  ResolvedLoggerConfig,
  Runtime,
  StructuredTransportOptions,
  Transport,
  TransportErrorHandler
} from "./types.js";
