/**
 * @file Browser transport for `@adrianhall/cloudflare-logger`.
 *
 * `createBrowserTransport()` formats records for browser DevTools using `%c`
 * styled level badges. It maps severity levels to appropriate console methods
 * and passes the context object as a separate argument when non-empty, so
 * DevTools can expand it interactively.
 *
 * Level-to-method mapping:
 *   trace, debug → console.debug
 *   info          → console.info
 *   warn          → console.warn
 *   error, fatal  → console.error
 */
import type { ConsoleLike } from "../internal/console.js";
import type { BrowserTransportOptions, Transport } from "../types.js";
/**
 * Create a browser transport optimized for DevTools output.
 *
 * @param options - Optional level style overrides.
 * @param _console - Injected console-like object (defaults to global `console`). Used in tests.
 * @returns A `Transport` that writes styled records to the browser console.
 */
export declare function createBrowserTransport(options?: BrowserTransportOptions, _console?: ConsoleLike): Transport;
//# sourceMappingURL=browser.d.ts.map