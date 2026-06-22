/**
 * @file Response body preview helpers for the Hono subpath.
 *
 * The response logger records only the first N bytes of the payload so that
 * large bodies do not bloat logs. These helpers are exported for direct unit
 * testing but are intentionally NOT re-exported from the `/hono` barrel.
 */
/** Default number of response body bytes recorded in logs. */
export const DEFAULT_PREVIEW_BYTES = 64;
/**
 * Return at most `maxBytes` bytes of `body` (UTF-8), appending `"..."` only when
 * the body exceeds the limit.
 *
 * Truncation is byte-accurate; when the cut falls inside a multi-byte code point
 * the trailing partial sequence is decoded to the Unicode replacement character,
 * which is acceptable for a log preview.
 */
export function previewResponseBody(body, maxBytes = DEFAULT_PREVIEW_BYTES) {
    const bytes = new TextEncoder().encode(body);
    if (bytes.length <= maxBytes) {
        return body;
    }
    return new TextDecoder().decode(bytes.slice(0, maxBytes)) + "...";
}
/**
 * Read a preview of a response body without consuming the original.
 *
 * The response is cloned before reading so the downstream response is
 * unaffected. Any failure (e.g. an unreadable or already-disturbed stream) is
 * swallowed and an empty string is returned, because logging must never throw
 * into application code.
 */
export async function readResponseBodyPreview(response, maxBytes = DEFAULT_PREVIEW_BYTES) {
    try {
        const text = await response.clone().text();
        return previewResponseBody(text, maxBytes);
    }
    catch {
        return "";
    }
}
//# sourceMappingURL=preview.js.map