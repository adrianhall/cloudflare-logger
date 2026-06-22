/**
 * @file Hono entry point for `@adrianhall/cloudflare-logger/hono`.
 *
 * Provides Hono middleware that attaches a request-scoped logger to the context
 * and logs each request and response. Import from this subpath in Hono-based
 * Cloudflare Workers. `hono` is an optional peer dependency, used only by this
 * subpath; the core entry point never imports it.
 *
 * @example
 * ```ts
 * import { Hono } from "hono";
 * import { loggingMiddleware } from "@adrianhall/cloudflare-logger/hono";
 *
 * const app = new Hono();
 * app.use("*", loggingMiddleware("production"));
 * ```
 */
export { loggingMiddleware } from "./middleware.js";
export type { LoggerBindings, LoggerVariables, LoggingMiddlewareOptions } from "./types.js";
//# sourceMappingURL=index.d.ts.map