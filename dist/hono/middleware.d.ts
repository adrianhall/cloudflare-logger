/**
 * @file `loggingMiddleware` for `@adrianhall/cloudflare-logger/hono`.
 *
 * Hono middleware that, for every request:
 *   1. Resolves the environment (explicit argument, else `c.env.ENVIRONMENT`).
 *   2. Builds a Worker logger via `resolveLoggerConfig`, allowing `level` and
 *      `transport` overrides (useful for tests).
 *   3. Derives a correlation ID from the `CF-Ray` header, or `crypto.randomUUID()`.
 *   4. Logs the request at `trace` with redacted headers and cookie names.
 *   5. Stores the request-scoped child logger in `c.var.LOGGER`.
 *   6. After `next()`, logs the response at `trace` with status, duration,
 *      redacted headers, cookie names, and a short body preview.
 *
 * Logging is best-effort and must never throw into application code.
 */
import type { MiddlewareHandler } from "hono";
import type { Environment } from "../types.js";
import type { LoggingMiddlewareOptions } from "./types.js";
/**
 * Create Hono middleware that attaches a request-scoped logger to the context
 * and logs each request and response.
 *
 * @param argument - Either an environment name (e.g. `"production"`) or a
 *   {@link LoggingMiddlewareOptions} object. When omitted, the environment is
 *   read from `c.env.ENVIRONMENT` at request time.
 *
 * @example
 * ```ts
 * import { Hono } from "hono";
 * import { loggingMiddleware } from "@adrianhall/cloudflare-logger/hono";
 *
 * const app = new Hono();
 * app.use("*", loggingMiddleware("production"));
 *
 * app.get("/", (c) => {
 *   c.var.LOGGER.info("handling request");
 *   return c.text("ok");
 * });
 * ```
 */
export declare function loggingMiddleware(argument?: Environment | LoggingMiddlewareOptions): MiddlewareHandler;
//# sourceMappingURL=middleware.d.ts.map