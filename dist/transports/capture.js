/**
 * @file Capture transport for `@adrianhall/cloudflare-logger`.
 *
 * `createCaptureTransport()` accumulates log records in memory without
 * writing to the console. It is intended for use in Vitest tests where
 * assertions need to inspect emitted records deterministically.
 *
 * Use `.find(level)` as the preferred assertion helper for level-specific
 * record checks rather than filtering `.records` manually.
 */
/**
 * Create a capture transport that stores records in memory.
 *
 * @returns A `CaptureTransport` with `.records`, `.clear()`, and `.find()`.
 */
export function createCaptureTransport() {
    let internal = [];
    return {
        log(record) {
            internal.push(record);
        },
        get records() {
            // Return a shallow copy so callers cannot mutate internal storage.
            return internal.slice();
        },
        clear() {
            internal = [];
        },
        find(level) {
            return internal.filter((r) => r.level === level);
        }
    };
}
//# sourceMappingURL=capture.js.map