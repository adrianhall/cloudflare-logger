/**
 * @file Internal console method fallback helpers for `@adrianhall/cloudflare-logger`.
 *
 * Transports use specific `console` methods (`debug`, `info`, `warn`, `error`,
 * `log`) to route records to the appropriate DevTools channel or log level in
 * the host environment. Some environments (notably older Workers runtimes and
 * custom test harnesses) may not expose every console method.
 *
 * `getConsoleMethod()` returns the requested console method when available and
 * falls back to `console.log` otherwise, preventing a missing-method crash from
 * surfacing into application code.
 *
 * This helper is intentionally **not exported** from the package entry point.
 */
/**
 * Return the named console method from `c`, falling back to `c.log` if the
 * method is absent or not a function.
 *
 * Rationale: logging must not crash because a host environment is missing a
 * specific console method. `console.log` is the safest baseline and is present
 * in every JS environment that supports `console` at all.
 *
 * @param c - The console-like object to query.
 * @param method - The preferred method name.
 * @returns The requested method if callable, otherwise `c.log`.
 */
export function getConsoleMethod(c, method) {
    const candidate = c[method];
    if (typeof candidate === "function") {
        return candidate.bind(c);
    }
    return c.log.bind(c);
}
//# sourceMappingURL=console.js.map