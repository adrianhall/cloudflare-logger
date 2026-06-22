/**
 * @file Structured transport for `@adrianhall/cloudflare-logger`.
 *
 * `createStructuredTransport()` emits records as structured payloads intended
 * for Cloudflare Workers Logs. Workers Logs automatically extracts and indexes
 * fields from JSON object logs, so this transport defaults to object logging
 * (`stringify: false`) rather than string logging.
 *
 * Payload shape: `{ time, level, message, ...context }`
 * Reserved keys (`time`, `level`, `message`) from the record take precedence
 * over identically named context keys.
 *
 * Level-to-method mapping:
 *   trace, debug → console.debug
 *   info          → console.log
 *   warn          → console.warn
 *   error, fatal  → console.error
 */
import { getConsoleMethod } from "../internal/console.js";
import { safeStringify } from "../internal/safe-json.js";
/** Map each log level to the preferred console method name. */
const LEVEL_METHOD = {
    trace: "debug",
    debug: "debug",
    info: "log",
    warn: "warn",
    error: "error",
    fatal: "error"
};
/**
 * Create a structured transport for Cloudflare Workers Logs.
 *
 * @param options - Optional stringify flag.
 * @param _console - Injected console-like object (defaults to global `console`). Used in tests.
 * @returns A `Transport` that writes structured payloads to the console.
 */
export function createStructuredTransport(options, _console = console) {
    const stringify = options?.stringify ?? false;
    return {
        log(record) {
            const methodName = LEVEL_METHOD[record.level];
            const method = getConsoleMethod(_console, methodName);
            // Build payload: context spread first, then reserved keys override.
            const payload = {
                ...record.context,
                time: record.time,
                level: record.level,
                message: record.message
            };
            if (stringify) {
                method(safeStringify(payload));
            }
            else {
                method(payload);
            }
        }
    };
}
//# sourceMappingURL=structured.js.map