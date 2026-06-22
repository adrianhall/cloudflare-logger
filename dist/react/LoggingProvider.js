import { jsx as _jsx } from "react/jsx-runtime";
import { LoggingContext } from "./context.js";
/**
 * Provides a `Logger` to all descendant components via React context.
 *
 * Construct a logger outside of the component tree (e.g. at module scope or
 * in an application entry point) and pass it here. Descendants call
 * `useLogger()` to retrieve the logger or a child logger with bound context.
 *
 * @example
 * ```tsx
 * const logger = createLogger(resolveLoggerConfig("development", "browser"));
 *
 * function App() {
 *   return (
 *     <LoggingProvider logger={logger}>
 *       <Widget />
 *     </LoggingProvider>
 *   );
 * }
 * ```
 */
export function LoggingProvider({ logger, children }) {
    return _jsx(LoggingContext.Provider, { value: logger, children: children });
}
//# sourceMappingURL=LoggingProvider.js.map