/**
 * @file Internal React context for `@adrianhall/cloudflare-logger/react`.
 *
 * The context holds the `Logger` instance supplied by `LoggingProvider`. It is
 * `undefined` by default so that `useLogger` can detect when it is used outside
 * a provider and throw a clear, actionable error.
 *
 * This module is intentionally not exported from the package's public surface.
 */

import { createContext } from "react";
import type { Logger } from "@adrianhall/cloudflare-logger";

/**
 * Internal React context that holds the logger supplied by `LoggingProvider`.
 *
 * The default value is `undefined` so that `useLogger` can detect when it is
 * called outside a `LoggingProvider` and throw a descriptive error.
 */
export const LoggingContext = createContext<Logger | undefined>(undefined);
