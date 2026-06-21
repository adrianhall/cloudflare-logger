/**
 * @file Worker compatibility tests for `src/transports/structured.ts`.
 *
 * Validates structured transport behaviour in the Cloudflare Workers runtime
 * (workerd) without Node.js compatibility shims.
 *
 * These tests run under `@cloudflare/vitest-pool-workers` (see vitest.config.ts).
 */

import { describe, expect, it } from "vitest";
import { createLogger } from "../../../src/logger.js";
import { createStructuredTransport } from "../../../src/transports/structured.js";

const clock = () => new Date("2026-01-01T00:00:00.000Z");
const FIXED_TIME = "2026-01-01T00:00:00.000Z";

describe("createStructuredTransport() — Workers runtime", () => {
  it("produces an object payload (stringify: false, default)", () => {
    const received: unknown[] = [];
    const mockConsole = { log: (...args: unknown[]) => received.push(args[0]) };

    const transport = createStructuredTransport({}, mockConsole);
    const logger = createLogger({ transport, clock });
    logger.info("structured record");

    expect(received).toHaveLength(1);
    const payload = received[0] as Record<string, unknown>;
    expect(payload["level"]).toBe("info");
    expect(payload["message"]).toBe("structured record");
    expect(payload["time"]).toBe(FIXED_TIME);
  });

  it("produces a JSON string payload with stringify: true", () => {
    const received: unknown[] = [];
    const mockConsole = { log: (...args: unknown[]) => received.push(args[0]) };

    const transport = createStructuredTransport({ stringify: true }, mockConsole);
    const logger = createLogger({ transport, clock });
    logger.info("json record");

    expect(received).toHaveLength(1);
    expect(typeof received[0]).toBe("string");
    const parsed = JSON.parse(received[0] as string) as Record<string, unknown>;
    expect(parsed["level"]).toBe("info");
    expect(parsed["message"]).toBe("json record");
  });

  it("reserved keys override context keys", () => {
    const received: unknown[] = [];
    const mockConsole = { log: (...args: unknown[]) => received.push(args[0]) };

    const transport = createStructuredTransport({}, mockConsole);
    const logger = createLogger({
      transport,
      clock,
      bindings: { level: "SHOULD_BE_OVERRIDDEN" }
    });
    logger.info("override test");

    const payload = received[0] as Record<string, unknown>;
    expect(payload["level"]).toBe("info");
  });
});
