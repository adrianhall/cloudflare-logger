/**
 * @file `useLogger` hook for `@adrianhall/cloudflare-logger/react`.
 *
 * Returns the `Logger` instance supplied by the nearest `LoggingProvider`.
 * When `bindings` are supplied, returns a memoized child logger that merges
 * those bindings on top of the provider's logger bindings.
 *
 * Memoization is based on referential identity of the provider's logger and
 * the `bindings` object. Callers should pass stable binding references (e.g.
 * a module-level constant or a `useMemo`/`useRef` value) when child logger
 * identity stability matters. Inline object literals are acceptable when
 * identity stability is not a concern.
 */
import type { LogContext, Logger } from "@adrianhall/cloudflare-logger";
/**
 * Return the logger supplied by the nearest `LoggingProvider`.
 *
 * When called without arguments, the provider's logger is returned directly.
 *
 * When called with a `bindings` object, a memoized child logger is returned.
 * The child logger merges `bindings` on top of the provider logger's own
 * bindings. A new child logger is only created when either the provider logger
 * reference or the `bindings` object reference changes.
 *
 * @throws {Error} When called outside a `LoggingProvider`.
 *
 * @example
 * ```tsx
 * // Module-level stable bindings so child logger identity is preserved.
 * const BINDINGS = { component: "Widget" } as const;
 *
 * function Widget() {
 *   const log = useLogger(BINDINGS);
 *
 *   useEffect(() => {
 *     log.info("mounted");
 *   }, [log]);
 *
 *   return null;
 * }
 * ```
 */
export declare function useLogger(bindings?: LogContext): Logger;
//# sourceMappingURL=useLogger.d.ts.map