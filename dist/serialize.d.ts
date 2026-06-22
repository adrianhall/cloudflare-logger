/**
 * @file Error serialization for `@adrianhall/cloudflare-logger`.
 *
 * `serializeError()` converts `Error` instances to plain objects so transports
 * can safely forward structured context without raw `Error` values escaping
 * into JSON serialization or console methods.
 *
 * Only top-level context values are serialized by the logger; nested errors are
 * left as-is unless they appear as a direct `cause` of a top-level error.
 */
/**
 * Serialize `value` if it is an `Error`; return it unchanged otherwise.
 *
 * - Non-`Error` values are returned as-is.
 * - `Error` instances become plain objects with `name`, `message`, and optionally
 *   `stack` and `cause`.
 * - `cause` is shallowly serialized when it is itself an `Error`.
 */
export declare function serializeError(value: unknown): unknown;
//# sourceMappingURL=serialize.d.ts.map