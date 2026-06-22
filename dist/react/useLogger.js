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
import { useContext, useMemo } from "react";
import { LoggingContext } from "./context.js";
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
export function useLogger(bindings) {
    const logger = useContext(LoggingContext);
    if (logger === undefined) {
        throw new Error("useLogger must be called inside a <LoggingProvider>. "
            + "Wrap your component tree with <LoggingProvider logger={...}> "
            + "before calling useLogger().");
    }
    // useMemo always runs, but the result is only meaningful when bindings are
    // supplied. When bindings is undefined the child() call is skipped entirely
    // and the provider logger is returned directly below.
    const childLogger = useMemo(() => {
        if (bindings === undefined) {
            return null;
        }
        return logger.child(bindings);
        // Dependency array intentionally uses object identity of logger and bindings.
        // Callers should pass stable binding references when child logger identity matters.
    }, [logger, bindings]);
    return childLogger !== null ? childLogger : logger;
}
//# sourceMappingURL=useLogger.js.map