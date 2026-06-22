/**
 * @file Silent transport for `@adrianhall/cloudflare-logger`.
 *
 * `createSilentTransport()` discards every record without emitting anything
 * to the console and without throwing. Use it as a no-op transport in
 * contexts where logging should be fully suppressed.
 */
/**
 * Create a silent transport that discards all records.
 *
 * @returns A `Transport` that does nothing.
 */
export function createSilentTransport() {
    return {
        log() {
            // Intentionally empty — records are dropped without side effects.
        }
    };
}
//# sourceMappingURL=silent.js.map