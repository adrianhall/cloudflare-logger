/**
 * @file `LoggingProvider` component for `@adrianhall/cloudflare-logger/react`.
 *
 * Wraps a subtree with a `Logger` instance stored in React context. All
 * descendants may call `useLogger()` to retrieve the logger or a child logger
 * bound with additional context.
 */

import type { ReactNode } from "react";
import type { Logger } from "@adrianhall/cloudflare-logger";
import { LoggingContext } from "./context.js";

/**
 * Props for `LoggingProvider`.
 */
export interface LoggingProviderProps {
  /** The logger instance to make available to all descendant components. */
  readonly logger: Logger;
  /** Child nodes that will have access to the logger via `useLogger()`. */
  readonly children: ReactNode;
}

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
export function LoggingProvider({ logger, children }: LoggingProviderProps): React.JSX.Element {
  return <LoggingContext.Provider value={logger}>{children}</LoggingContext.Provider>;
}
