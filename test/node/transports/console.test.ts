/**
 * @file Tests for `src/transports/console.ts`.
 *
 * Covers all required cases from ENG_SPEC.md §20.1 (Console transport):
 *  - Timestamp variants (`time`, `iso`, `false`).
 *  - Color enabled and disabled output.
 *  - Fixed-width level formatting.
 *  - Context formatting.
 *  - Sink split between `console.log` and `console.error`.
 *  - Safe handling of circular and BigInt context.
 */

import { describe, expect, it, vi } from "vitest";
import * as sut from "../../src/transports/console.js";
import type { ConsoleLike } from "../../src/internal/console.js";
import type { LogLevel, LogRecord } from "../../src/types.js";

/** ANSI escape sequence pattern (used to strip colors for plain-text assertions). */
// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /\x1b\[[0-9;]*m/g;

/** Build a minimal LogRecord for testing. */
function makeRecord(overrides?: Partial<LogRecord>): LogRecord {
  return {
    time: "2026-01-01T12:30:45.000Z",
    level: "info",
    levelValue: 30,
    message: "server started",
    context: {},
    ...overrides
  };
}

/** Create a spy console that captures calls to `log` and `error`. */
function makeConsoleSpy() {
  const logCalls: unknown[][] = [];
  const errorCalls: unknown[][] = [];
  const c: ConsoleLike = {
    log: vi.fn((...args: unknown[]) => logCalls.push(args)),
    error: vi.fn((...args: unknown[]) => errorCalls.push(args))
  };
  return { c, logCalls, errorCalls };
}

describe("extractTime()", () => {
  it("extracts HH:MM:SS from a standard ISO 8601 string", () => {
    expect(sut.extractTime("2026-01-01T12:30:45.000Z")).toBe("12:30:45");
  });

  it("extracts HH:MM:SS when milliseconds and timezone differ", () => {
    expect(sut.extractTime("1999-12-31T23:59:59.999+05:30")).toBe("23:59:59");
  });

  it("falls back to the first 8 characters when no T separator is present", () => {
    // "20260101" is 8 chars — slice(0,8) returns the whole value unchanged.
    expect(sut.extractTime("20260101123045")).toBe("20260101");
  });

  it("falls back gracefully for an entirely unexpected string", () => {
    expect(sut.extractTime("no-separator-here")).toBe("no-separ");
  });
});

describe("createConsoleTransport()", () => {
  // ---------------------------------------------------------------------------
  // Default console parameter
  // ---------------------------------------------------------------------------

  describe("default console parameter", () => {
    it("uses the global console when no _console argument is supplied", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
      try {
        const transport = sut.createConsoleTransport({ timestamp: false });
        transport.log(makeRecord({ level: "info" }));
        expect(spy).toHaveBeenCalledOnce();
      } finally {
        spy.mockRestore();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Sink routing
  // ---------------------------------------------------------------------------

  describe("sink routing", () => {
    it("routes trace to console.log", () => {
      const { c, logCalls } = makeConsoleSpy();
      const transport = sut.createConsoleTransport({}, c);
      transport.log(makeRecord({ level: "trace", levelValue: 10 }));
      expect(logCalls).toHaveLength(1);
    });

    it("routes debug to console.log", () => {
      const { c, logCalls } = makeConsoleSpy();
      const transport = sut.createConsoleTransport({}, c);
      transport.log(makeRecord({ level: "debug", levelValue: 20 }));
      expect(logCalls).toHaveLength(1);
    });

    it("routes info to console.log", () => {
      const { c, logCalls } = makeConsoleSpy();
      const transport = sut.createConsoleTransport({}, c);
      transport.log(makeRecord({ level: "info", levelValue: 30 }));
      expect(logCalls).toHaveLength(1);
    });

    it("routes warn to console.error", () => {
      const { c, errorCalls } = makeConsoleSpy();
      const transport = sut.createConsoleTransport({}, c);
      transport.log(makeRecord({ level: "warn", levelValue: 40 }));
      expect(errorCalls).toHaveLength(1);
    });

    it("routes error to console.error", () => {
      const { c, errorCalls } = makeConsoleSpy();
      const transport = sut.createConsoleTransport({}, c);
      transport.log(makeRecord({ level: "error", levelValue: 50 }));
      expect(errorCalls).toHaveLength(1);
    });

    it("routes fatal to console.error", () => {
      const { c, errorCalls } = makeConsoleSpy();
      const transport = sut.createConsoleTransport({}, c);
      transport.log(makeRecord({ level: "fatal", levelValue: 60 }));
      expect(errorCalls).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Timestamp variants
  // ---------------------------------------------------------------------------

  describe("timestamp variants", () => {
    it("emits HH:MM:SS time with timestamp:'time' (default)", () => {
      const { c, logCalls } = makeConsoleSpy();
      const transport = sut.createConsoleTransport({ colors: false }, c);
      transport.log(makeRecord({ time: "2026-01-01T12:30:45.000Z" }));
      const line = logCalls[0]?.[0] as string;
      expect(line).toContain("12:30:45");
    });

    it("emits full ISO timestamp with timestamp:'iso'", () => {
      const { c, logCalls } = makeConsoleSpy();
      const transport = sut.createConsoleTransport({ colors: false, timestamp: "iso" }, c);
      transport.log(makeRecord({ time: "2026-01-01T12:30:45.000Z" }));
      const line = logCalls[0]?.[0] as string;
      expect(line).toContain("2026-01-01T12:30:45.000Z");
    });

    it("wraps ISO timestamp in ANSI gray when colors:true", () => {
      const { c, logCalls } = makeConsoleSpy();
      const transport = sut.createConsoleTransport({ colors: true, timestamp: "iso" }, c);
      transport.log(makeRecord({ time: "2026-01-01T12:30:45.000Z" }));
      const line = logCalls[0]?.[0] as string;
      expect(line).toContain("2026-01-01T12:30:45.000Z");
      expect(ANSI_PATTERN.test(line)).toBe(true);
    });

    it("omits timestamp with timestamp:false", () => {
      const { c, logCalls } = makeConsoleSpy();
      const transport = sut.createConsoleTransport({ colors: false, timestamp: false }, c);
      transport.log(makeRecord({ time: "2026-01-01T12:30:45.000Z" }));
      const line = logCalls[0]?.[0] as string;
      expect(line).not.toContain("12:30:45");
      expect(line).not.toContain("2026-01-01");
    });
  });

  // ---------------------------------------------------------------------------
  // Level label
  // ---------------------------------------------------------------------------

  describe("level labels", () => {
    const LEVELS: [LogLevel, string][] = [
      ["trace", "TRACE"],
      ["debug", "DEBUG"],
      ["info", "INFO"],
      ["warn", "WARN"],
      ["error", "ERROR"],
      ["fatal", "FATAL"]
    ];

    for (const [level, label] of LEVELS) {
      it(`includes '${label}' label for level '${level}'`, () => {
        const { c, logCalls, errorCalls } = makeConsoleSpy();
        const transport = sut.createConsoleTransport({ colors: false, timestamp: false }, c);
        transport.log(makeRecord({ level, levelValue: 10 }));
        const all = [...logCalls, ...errorCalls];
        const line = all[0]?.[0] as string;
        expect(line).toContain(label);
      });
    }
  });

  // ---------------------------------------------------------------------------
  // Color mode
  // ---------------------------------------------------------------------------

  describe("color mode", () => {
    it("emits ANSI codes when colors:true (default)", () => {
      const { c, logCalls } = makeConsoleSpy();
      const transport = sut.createConsoleTransport({}, c);
      transport.log(makeRecord());
      const line = logCalls[0]?.[0] as string;
      expect(ANSI_PATTERN.test(line)).toBe(true);
    });

    it("emits no ANSI codes when colors:false", () => {
      const { c, logCalls } = makeConsoleSpy();
      const transport = sut.createConsoleTransport({ colors: false }, c);
      transport.log(makeRecord());
      const line = logCalls[0]?.[0] as string;
      expect(ANSI_PATTERN.test(line)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Message
  // ---------------------------------------------------------------------------

  describe("message", () => {
    it("includes the record message in the output", () => {
      const { c, logCalls } = makeConsoleSpy();
      const transport = sut.createConsoleTransport({ colors: false, timestamp: false }, c);
      transport.log(makeRecord({ message: "server started" }));
      const line = logCalls[0]?.[0] as string;
      expect(line).toContain("server started");
    });
  });

  // ---------------------------------------------------------------------------
  // Context formatting
  // ---------------------------------------------------------------------------

  describe("context formatting", () => {
    it("appends compact JSON context when non-empty", () => {
      const { c, logCalls } = makeConsoleSpy();
      const transport = sut.createConsoleTransport({ colors: false, timestamp: false }, c);
      transport.log(makeRecord({ context: { port: 8787 } }));
      const line = logCalls[0]?.[0] as string;
      expect(line).toContain('{"port":8787}');
    });

    it("omits context when empty", () => {
      const { c, logCalls } = makeConsoleSpy();
      const transport = sut.createConsoleTransport({ colors: false, timestamp: false }, c);
      transport.log(makeRecord({ context: {}, message: "hello" }));
      const line = logCalls[0]?.[0] as string;
      // Should not contain any JSON braces beyond the message itself.
      expect(line.endsWith("hello")).toBe(true);
    });

    it("handles circular references safely", () => {
      const obj: Record<string, unknown> = { a: 1 };
      obj["self"] = obj;
      const { c, logCalls } = makeConsoleSpy();
      const transport = sut.createConsoleTransport({ colors: false, timestamp: false }, c);
      expect(() => transport.log(makeRecord({ context: obj }))).not.toThrow();
      const line = logCalls[0]?.[0] as string;
      expect(line).toContain("[Circular]");
    });

    it("handles BigInt values safely", () => {
      const { c, logCalls } = makeConsoleSpy();
      const transport = sut.createConsoleTransport({ colors: false, timestamp: false }, c);
      expect(() => transport.log(makeRecord({ context: { count: BigInt(42) } }))).not.toThrow();
      const line = logCalls[0]?.[0] as string;
      expect(line).toContain("42n");
    });
  });

  // ---------------------------------------------------------------------------
  // Example from ENG_SPEC.md §14.4
  // ---------------------------------------------------------------------------

  describe("spec example", () => {
    it("produces a line matching: HH:MM:SS LEVEL  message {context}", () => {
      const { c, logCalls } = makeConsoleSpy();
      const transport = sut.createConsoleTransport({ colors: false, timestamp: "time" }, c);
      transport.log(
        makeRecord({
          time: "2026-01-01T12:30:45.000Z",
          message: "server started",
          context: { port: 8787 }
        })
      );
      const line = logCalls[0]?.[0] as string;
      expect(line).toBe('12:30:45 INFO  server started {"port":8787}');
    });
  });
});
