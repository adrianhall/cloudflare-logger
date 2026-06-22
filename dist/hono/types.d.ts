/**
 * @file Public types for `@adrianhall/cloudflare-logger/hono`.
 *
 * These types form the stable public contract for the Hono subpath. They let
 * consumers type their `Hono` instance so that `c.env.ENVIRONMENT` and
 * `c.var.LOGGER` are statically known.
 */
import type { Environment, Logger, LogLevel, Transport } from "../types.js";
/**
 * Options accepted by `loggingMiddleware`.
 *
 * Every field is optional. When omitted, the middleware resolves its level and
 * transport from `resolveLoggerConfig(environment, "worker")`. `environment`
 * itself falls back to `c.env.ENVIRONMENT` when not supplied.
 *
 * `level` and `transport` are primarily useful for tests (inject a capture
 * transport) and advanced wiring, but are part of the supported surface.
 */
export interface LoggingMiddlewareOptions {
    /**
     * Environment hint passed to `resolveLoggerConfig`. When omitted, the
     * middleware reads `c.env.ENVIRONMENT` at request time.
     */
    readonly environment?: Environment;
    /**
     * Minimum severity level to emit. Defaults to the level chosen by
     * `resolveLoggerConfig(environment, "worker")`.
     *
     * Note: the request and response are logged at `trace`, so the default
     * `production` level (`warn`) suppresses them. Set `level: "trace"` to emit
     * request/response logs in production.
     */
    readonly level?: LogLevel;
    /**
     * Transport to receive emitted records. Defaults to the transport chosen by
     * `resolveLoggerConfig(environment, "worker")`. Inject a capture transport in
     * tests to assert on emitted records.
     */
    readonly transport?: Transport;
}
/**
 * Worker bindings the middleware reads. Intersect this with your own bindings
 * when typing your `Hono` instance:
 *
 * ```ts
 * const app = new Hono<{ Bindings: LoggerBindings & MyBindings }>();
 * ```
 */
export interface LoggerBindings {
    /** Environment name used when `loggingMiddleware` is called without an argument. */
    readonly ENVIRONMENT?: Environment;
}
/**
 * Context variables the middleware sets. Intersect this with your own variables
 * when typing your `Hono` instance so that `c.var.LOGGER` is statically known:
 *
 * ```ts
 * const app = new Hono<{ Variables: LoggerVariables }>();
 * ```
 */
export interface LoggerVariables {
    /** The request-scoped child logger set by `loggingMiddleware`. */
    LOGGER: Logger;
}
//# sourceMappingURL=types.d.ts.map