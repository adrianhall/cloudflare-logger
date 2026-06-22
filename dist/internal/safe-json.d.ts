/**
 * @file Internal safe JSON/string formatting for `@adrianhall/cloudflare-logger`.
 *
 * `safeStringify()` serializes arbitrary values to a compact JSON string while
 * handling the common non-JSON types that appear in structured log context:
 *   - Circular references  → `"[Circular]"`
 *   - `bigint`             → `"<n>n"` (e.g. `42n` → `"42n"`)
 *   - `symbol`             → `"Symbol(description)"`
 *   - `function`           → `"[Function name]"` or `"[Function (anonymous)]"`
 *   - `undefined`          → omitted from objects, `"undefined"` at top level
 *
 * This helper is intentionally **not exported** from the package entry point.
 * It is used by `createConsoleTransport` and `createStructuredTransport`.
 */
/**
 * Convert a single value to a JSON-safe replacement.
 *
 * Called from the `JSON.stringify` replacer for every value encountered
 * during serialization. Non-JSON-safe primitives (`bigint`, `symbol`,
 * `function`) are converted to descriptive strings. All other values are
 * returned unchanged so that `JSON.stringify` handles them normally.
 *
 * Exported for direct unit testing so the default return path (line that
 * returns `value` unchanged) is reachable without going through the full
 * replacer loop.
 *
 * @param value - The raw value at the current key.
 * @returns A JSON-safe replacement value.
 */
export declare function replaceNonJsonValue(value: unknown): unknown;
/**
 * Serialize `value` to a compact JSON string.
 *
 * Handles:
 * - Circular references (replaced with `"[Circular]"`)
 * - `bigint` (serialized as `"<n>n"`)
 * - `symbol` (serialized as `"Symbol(description)"`)
 * - `function` (serialized as `"[Function name]"`)
 * - `undefined` at the top level (returns `"undefined"`)
 * - Unexpected formatter errors (returns `"[FormattingError]"`)
 *
 * @param value - The value to serialize.
 * @returns A JSON string representation.
 */
export declare function safeStringify(value: unknown): string;
//# sourceMappingURL=safe-json.d.ts.map