/**
 * @file Header and cookie summarization helpers for the Hono subpath.
 *
 * These helpers turn a `Headers` object into a log-safe plain object:
 *   - Cookie headers (`cookie` request / `set-cookie` response) are never logged
 *     with their values; only cookie names are recorded elsewhere.
 *   - Sensitive headers (`authorization`, `cf-access-jwt-authorization`) are
 *     reduced to a presence indicator so their bearer tokens never reach logs.
 *
 * They are exported for direct unit testing but are intentionally NOT re-exported
 * from the `/hono` barrel, so they never become public API.
 */
/** Lowercased header names whose values are replaced with a presence indicator. */
const REDACTED_HEADERS = new Set([
    "authorization",
    "cf-access-jwt-authorization"
]);
/** Placeholder recorded in place of a sensitive header value. */
const REDACTED_VALUE = "[redacted]";
/**
 * Extract the name from a single cookie pair such as `"name=value; Path=/"`.
 * Returns the trimmed substring before the first `=`, or the whole trimmed
 * string when no `=` is present.
 */
export function cookieName(pair) {
    const eq = pair.indexOf("=");
    return (eq === -1 ? pair : pair.slice(0, eq)).trim();
}
/**
 * Parse the names of cookies from a request `Cookie` header value.
 *
 * Returns an empty array for `null`/`undefined`/empty input. Cookie values are
 * never returned — only names — to avoid logging sensitive contents.
 */
export function parseCookieHeader(cookieHeader) {
    if (!cookieHeader) {
        return [];
    }
    return cookieHeader
        .split(";")
        .map((pair) => cookieName(pair))
        .filter((name) => name.length > 0);
}
/**
 * Convert a `Headers` object into a log-safe plain object.
 *
 * - `cookie` and `set-cookie` headers are omitted (their names are logged
 *   separately via {@link parseCookieHeader} / `Headers.getSetCookie`).
 * - `authorization` and `cf-access-jwt-authorization` values are replaced with
 *   `"[redacted]"` so only their presence is recorded.
 * - All other headers are copied verbatim.
 */
export function redactHeaders(headers) {
    const result = {};
    headers.forEach((value, key) => {
        const lower = key.toLowerCase();
        if (lower === "cookie" || lower === "set-cookie") {
            return;
        }
        result[key] = REDACTED_HEADERS.has(lower) ? REDACTED_VALUE : value;
    });
    return result;
}
//# sourceMappingURL=headers.js.map