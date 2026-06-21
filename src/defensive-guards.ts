/**
 * @file Defensive guard helpers for `@adrianhall/cloudflare-logger`.
 *
 * Centralizes small, testable guard utilities used across the library.
 * None of these are exported from the package entry point.
 */

/**
 * Returns `{ [prop]: o[prop] }` when `prop` is an own property of `o` with a
 * non-`undefined` value, otherwise returns `{}`.
 *
 * Intended for safely spreading optional fields onto plain objects without
 * introducing `undefined`-valued keys:
 *
 * ```ts
 * const result = {
 *   name: err.name,
 *   ...optionalField(err, "stack"),
 * };
 * ```
 */
export function optionalField<T extends object>(
  o: T,
  prop: keyof T
): Partial<Pick<T, typeof prop>> {
  return o[prop] !== undefined ? ({ [prop]: o[prop] } as Partial<Pick<T, typeof prop>>) : {};
}
