/**
 * @file Browser-environment tests for `src/resolve.ts`.
 *
 * Runs under jsdom to verify that the browser transport rows in the
 * `resolveLoggerConfig` policy table emit records correctly using browser
 * console methods (`console.info`, `console.warn`, etc.).
 *
 * Node-environment policy coverage lives in `test/node/resolve.test.ts`.
 * These tests focus on verifying that the browser transport produced by
 * `resolveLoggerConfig` actually emits to the jsdom console as expected.
 */

import { describe, expect, it, vi } from "vitest";
import * as sut from "../../src/resolve.js";
import type { LogRecord } from "../../src/types.js";

/** Build a minimal LogRecord for testing. */
function makeRecord(overrides?: Partial<LogRecord>): LogRecord {
  return {
    time: "2026-01-01T00:00:00.000Z",
    level: "info",
    levelValue: 30,
    message: "test",
    context: {},
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// development + browser → browser transport at "info" level
// ---------------------------------------------------------------------------

describe('resolveLoggerConfig("development", "browser") — browser transport behavior', () => {
  it('uses console.info for an "info" record', () => {
    const { transport } = sut.resolveLoggerConfig("development", "browser");
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});

    transport.log(makeRecord({ level: "info", levelValue: 30 }));

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('uses console.warn for a "warn" record', () => {
    const { transport } = sut.resolveLoggerConfig("development", "browser");
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});

    transport.log(makeRecord({ level: "warn", levelValue: 40 }));

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('uses console.error for a "fatal" record', () => {
    const { transport } = sut.resolveLoggerConfig("development", "browser");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    transport.log(makeRecord({ level: "fatal", levelValue: 60 }));

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("emits a %c badge in the first argument", () => {
    const { transport } = sut.resolveLoggerConfig("development", "browser");
    const calls: unknown[][] = [];
    const spy = vi.spyOn(console, "info").mockImplementation((...args: unknown[]) => {
      calls.push(args);
    });

    transport.log(makeRecord({ level: "info", levelValue: 30, message: "hello" }));

    expect(calls[0]?.[0]).toMatch(/^%c/);
    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// production + browser → browser transport at "warn" level
// ---------------------------------------------------------------------------

describe('resolveLoggerConfig("production", "browser") — browser transport behavior', () => {
  it('uses console.warn for a "warn" record', () => {
    const { transport } = sut.resolveLoggerConfig("production", "browser");
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});

    transport.log(makeRecord({ level: "warn", levelValue: 40 }));

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('uses console.error for an "error" record', () => {
    const { transport } = sut.resolveLoggerConfig("production", "browser");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    transport.log(makeRecord({ level: "error", levelValue: 50 }));

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// unknown + browser → browser transport at "warn" level (production fallback)
// ---------------------------------------------------------------------------

describe('resolveLoggerConfig(unknown, "browser") — production fallback', () => {
  it('unknown environment + browser → level "warn"', () => {
    const { level } = sut.resolveLoggerConfig("canary", "browser");
    expect(level).toBe("warn");
  });

  it("unknown environment + browser → browser transport (emits %c badge)", () => {
    const { transport } = sut.resolveLoggerConfig("canary", "browser");
    const calls: unknown[][] = [];
    const spy = vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
      calls.push(args);
    });

    transport.log(makeRecord({ level: "warn", levelValue: 40, message: "probe" }));

    expect(calls[0]?.[0]).toMatch(/^%c/);
    spy.mockRestore();
  });
});
