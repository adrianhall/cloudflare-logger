/**
 * @file Core entry point for `@adrianhall/cloudflare-logger`.
 *
 * Exports are added incrementally across implementation phases as described in
 * `docs/ENG_SPEC.md`. Phase 2 adds public types; later phases add runtime
 * implementations.
 *
 * React exports live exclusively under `@adrianhall/cloudflare-logger/react`.
 * This entry point must never import React.
 */

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
