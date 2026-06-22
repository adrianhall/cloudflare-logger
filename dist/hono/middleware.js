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
import { createLogger } from "../logger.js";
import { resolveLoggerConfig } from "../resolve.js";
import { cookieName, parseCookieHeader, redactHeaders } from "./headers.js";
import { readResponseBodyPreview } from "./preview.js";
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
export function loggingMiddleware(argument) {
    const options = typeof argument === "object" ? argument : { environment: argument };
    return async (c, next) => {
        const environment = options.environment ?? c.env?.ENVIRONMENT;
        const base = resolveLoggerConfig(environment, "worker");
        const logger = createLogger({
            level: options.level ?? base.level,
            transport: options.transport ?? base.transport
        });
        const correlationId = c.req.header("CF-Ray") ?? crypto.randomUUID();
        const log = logger.child({ correlationId });
        const requestHeaders = c.req.raw.headers;
        log.trace("request", {
            method: c.req.method,
            url: c.req.url,
            headers: redactHeaders(requestHeaders),
            cookies: parseCookieHeader(requestHeaders.get("cookie"))
        });
        c.set("LOGGER", log);
        const start = Date.now();
        await next();
        const durationMs = Date.now() - start;
        const responseHeaders = c.res.headers;
        log.trace("response", {
            status: c.res.status,
            durationMs,
            headers: redactHeaders(responseHeaders),
            cookies: responseHeaders.getSetCookie().map(cookieName),
            body: await readResponseBodyPreview(c.res)
        });
    };
}
//# sourceMappingURL=middleware.js.map