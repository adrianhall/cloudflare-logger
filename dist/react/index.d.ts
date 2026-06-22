/**
 * @file React entry point for `@adrianhall/cloudflare-logger/react`.
 *
 * Provides React context wiring for `@adrianhall/cloudflare-logger`. Import
 * from this subpath in browser React applications. Do not import this subpath
 * in Workers or server-side code.
 *
 * @example
 * ```tsx
 * import { createLogger, resolveLoggerConfig } from "@adrianhall/cloudflare-logger";
 * import { LoggingProvider, useLogger } from "@adrianhall/cloudflare-logger/react";
 * ```
 */
export { LoggingProvider } from "./LoggingProvider.js";
export type { LoggingProviderProps } from "./LoggingProvider.js";
export { useLogger } from "./useLogger.js";
//# sourceMappingURL=index.d.ts.map