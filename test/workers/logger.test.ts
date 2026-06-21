/**
 * @file Worker compatibility tests for `src/logger.ts`.
 *
 * Validates that the core logger works correctly in the Cloudflare Workers
 * runtime (workerd) without Node.js compatibility shims.
 *
 * These tests run under `@cloudflare/vitest-pool-workers` (see vitest.config.ts).
 */

import { describe, expect, it } from "vitest";
import { createLogger } from "../../src/logger.js";
import { createCaptureTransport } from "../../src/transports/capture.js";

const clock = () => new Date("2026-01-01T00:00:00.000Z");

describe("createLogger() — Workers runtime", () => {
  it("creates a logger and emits info records", () => {
    const capture = createCaptureTransport();
    const logger = createLogger({ transport: capture, clock });
    logger.info("worker started");
    expect(capture.find("info")).toHaveLength(1);
    expect(capture.find("info")[0]?.message).toBe("worker started");
  });

  it("suppresses debug at default info level", () => {
    const capture = createCaptureTransport();
    const logger = createLogger({ transport: capture, clock });
    logger.debug("suppressed");
    expect(capture.find("debug")).toHaveLength(0);
  });

  it("creates child loggers with bindings", () => {
    const capture = createCaptureTransport();
    const logger = createLogger({ transport: capture, clock });
    const child = logger.child({ requestId: "req-123" });
    child.info("request received");
    const records = capture.find("info");
    expect(records).toHaveLength(1);
    expect(records[0]?.context["requestId"]).toBe("req-123");
  });
});
