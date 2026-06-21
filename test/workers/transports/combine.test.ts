/**
 * @file Worker compatibility tests for `src/transports/combine.ts`.
 *
 * Validates combine transport behaviour in the Cloudflare Workers runtime
 * (workerd) without Node.js compatibility shims.
 *
 * These tests run under `@cloudflare/vitest-pool-workers` (see vitest.config.ts).
 */

import { describe, expect, it } from "vitest";
import { createLogger } from "../../../src/logger.js";
import { createCaptureTransport } from "../../../src/transports/capture.js";
import { combineTransports } from "../../../src/transports/combine.js";
import type { LogRecord } from "../../../src/types.js";

const clock = () => new Date("2026-01-01T00:00:00.000Z");

describe("combineTransports() — Workers runtime", () => {
  it("delivers records to all transports", () => {
    const capture1 = createCaptureTransport();
    const capture2 = createCaptureTransport();
    const combined = combineTransports(capture1, capture2);
    const logger = createLogger({ transport: combined, clock });

    logger.info("both transports");

    expect(capture1.find("info")).toHaveLength(1);
    expect(capture2.find("info")).toHaveLength(1);
  });

  it("transport errors do not crash application code", () => {
    const throwing = {
      log(_record: LogRecord): void {
        throw new Error("transport failure");
      }
    };
    const capture = createCaptureTransport();
    const combined = combineTransports(throwing, capture);
    const logger = createLogger({
      transport: combined,
      clock,
      onTransportError: () => {
        // swallow
      }
    });

    expect(() => logger.info("safe")).not.toThrow();
    expect(capture.find("info")).toHaveLength(1);
  });
});
