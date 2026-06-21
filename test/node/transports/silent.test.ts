/**
 * @file Tests for `src/transports/silent.ts`.
 *
 * Covers all required cases from ENG_SPEC.md §20.1 (Silent transport):
 *  - No console output.
 *  - No throw.
 */

import { describe, expect, it, vi } from "vitest";
import * as sut from "../../src/transports/silent.js";
import type { LogRecord } from "../../src/types.js";

/** Build a minimal LogRecord for testing. */
function makeRecord(overrides?: Partial<LogRecord>): LogRecord {
  return {
    time: "2026-01-01T00:00:00.000Z",
    level: "info",
    levelValue: 30,
    message: "test message",
    context: {},
    ...overrides
  };
}

describe("createSilentTransport()", () => {
  it("returns a transport with a log method", () => {
    const transport = sut.createSilentTransport();
    expect(typeof transport.log).toBe("function");
  });

  it("does not throw when log() is called", () => {
    const transport = sut.createSilentTransport();
    expect(() => transport.log(makeRecord())).not.toThrow();
  });

  it("does not call any console method", () => {
    const logSpy = vi.spyOn(console, "log");
    const errorSpy = vi.spyOn(console, "error");
    const warnSpy = vi.spyOn(console, "warn");
    const infoSpy = vi.spyOn(console, "info");
    const debugSpy = vi.spyOn(console, "debug");

    const transport = sut.createSilentTransport();
    transport.log(makeRecord());

    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(debugSpy).not.toHaveBeenCalled();

    logSpy.mockRestore();
    errorSpy.mockRestore();
    warnSpy.mockRestore();
    infoSpy.mockRestore();
    debugSpy.mockRestore();
  });

  it("does not throw for any log level", () => {
    const transport = sut.createSilentTransport();
    const levels = ["trace", "debug", "info", "warn", "error", "fatal"] as const;
    for (const level of levels) {
      expect(() => transport.log(makeRecord({ level, message: `${level} message` }))).not.toThrow();
    }
  });

  it("each call to createSilentTransport returns an independent transport", () => {
    const t1 = sut.createSilentTransport();
    const t2 = sut.createSilentTransport();
    expect(t1).not.toBe(t2);
  });
});
