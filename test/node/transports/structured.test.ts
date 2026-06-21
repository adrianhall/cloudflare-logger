/**
 * @file Tests for `src/transports/structured.ts`.
 *
 * Covers all required cases from ENG_SPEC.md §20.1 (Structured transport):
 *  - Level-to-console-method mapping.
 *  - Object payload shape.
 *  - `stringify: true` behavior.
 *  - Reserved-key precedence (`time`, `level`, `message`).
 *  - Safe handling of circular and BigInt values in string mode.
 */

import { describe, expect, it, vi } from "vitest";
import * as sut from "../../src/transports/structured.js";
import type { ConsoleLike } from "../../src/internal/console.js";
import type { LogLevel, LogRecord } from "../../src/types.js";

/** Build a minimal LogRecord for testing. */
function makeRecord(overrides?: Partial<LogRecord>): LogRecord {
  return {
    time: "2026-01-01T00:00:00.000Z",
    level: "info",
    levelValue: 30,
    message: "hello",
    context: {},
    ...overrides
  };
}

/** Create a spy console that captures all method calls. */
function makeConsoleSpy() {
  const calls: Record<string, unknown[][]> = {
    debug: [],
    info: [],
    log: [],
    warn: [],
    error: []
  };
  const c: ConsoleLike = {
    debug: vi.fn((...args: unknown[]) => calls["debug"]!.push(args)),
    info: vi.fn((...args: unknown[]) => calls["info"]!.push(args)),
    log: vi.fn((...args: unknown[]) => calls["log"]!.push(args)),
    warn: vi.fn((...args: unknown[]) => calls["warn"]!.push(args)),
    error: vi.fn((...args: unknown[]) => calls["error"]!.push(args))
  };
  return { c, calls };
}

describe("createStructuredTransport()", () => {
  // ---------------------------------------------------------------------------
  // Level-to-method mapping
  // ---------------------------------------------------------------------------

  describe("level-to-method mapping", () => {
    const ROUTING: [LogLevel, string][] = [
      ["trace", "debug"],
      ["debug", "debug"],
      ["info", "log"],
      ["warn", "warn"],
      ["error", "error"],
      ["fatal", "error"]
    ];

    for (const [level, method] of ROUTING) {
      it(`routes '${level}' to console.${method}`, () => {
        const { c, calls } = makeConsoleSpy();
        const transport = sut.createStructuredTransport({}, c);
        transport.log(makeRecord({ level }));
        expect(calls[method]).toHaveLength(1);
        // All other methods should not have been called.
        for (const [m, recorded] of Object.entries(calls)) {
          if (m !== method) {
            expect(recorded, `unexpected call to console.${m}`).toHaveLength(0);
          }
        }
      });
    }
  });

  // ---------------------------------------------------------------------------
  // Object payload (stringify: false, default)
  // ---------------------------------------------------------------------------

  describe("object payload (default, stringify: false)", () => {
    it("passes a single object argument to the console method", () => {
      const { c, calls } = makeConsoleSpy();
      const transport = sut.createStructuredTransport({}, c);
      transport.log(makeRecord());
      const args = calls["log"]![0]!;
      expect(args).toHaveLength(1);
      expect(typeof args[0]).toBe("object");
    });

    it("payload includes time, level, and message from the record", () => {
      const { c, calls } = makeConsoleSpy();
      const transport = sut.createStructuredTransport({}, c);
      const record = makeRecord({
        time: "2026-01-01T00:00:00.000Z",
        level: "info",
        message: "hello"
      });
      transport.log(record);
      const payload = calls["log"]![0]![0] as Record<string, unknown>;
      expect(payload["time"]).toBe("2026-01-01T00:00:00.000Z");
      expect(payload["level"]).toBe("info");
      expect(payload["message"]).toBe("hello");
    });

    it("payload includes context fields", () => {
      const { c, calls } = makeConsoleSpy();
      const transport = sut.createStructuredTransport({}, c);
      transport.log(makeRecord({ context: { userId: "abc", requestId: "123" } }));
      const payload = calls["log"]![0]![0] as Record<string, unknown>;
      expect(payload["userId"]).toBe("abc");
      expect(payload["requestId"]).toBe("123");
    });

    it("reserved keys from the record override context keys", () => {
      const { c, calls } = makeConsoleSpy();
      const transport = sut.createStructuredTransport({}, c);
      // Context contains keys that would shadow record fields.
      transport.log(
        makeRecord({
          time: "2026-01-01T00:00:00.000Z",
          level: "info",
          message: "real message",
          context: { time: "WRONG", level: "WRONG", message: "WRONG" }
        })
      );
      const payload = calls["log"]![0]![0] as Record<string, unknown>;
      expect(payload["time"]).toBe("2026-01-01T00:00:00.000Z");
      expect(payload["level"]).toBe("info");
      expect(payload["message"]).toBe("real message");
    });
  });

  // ---------------------------------------------------------------------------
  // Default console parameter
  // ---------------------------------------------------------------------------

  describe("default console parameter", () => {
    it("uses the global console when no _console argument is supplied", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
      try {
        const transport = sut.createStructuredTransport();
        transport.log(makeRecord({ level: "info" }));
        expect(spy).toHaveBeenCalledOnce();
      } finally {
        spy.mockRestore();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // String payload (stringify: true)
  // ---------------------------------------------------------------------------

  describe("string payload (stringify: true)", () => {
    it("passes a single string argument to the console method", () => {
      const { c, calls } = makeConsoleSpy();
      const transport = sut.createStructuredTransport({ stringify: true }, c);
      transport.log(makeRecord());
      const args = calls["log"]![0]!;
      expect(args).toHaveLength(1);
      expect(typeof args[0]).toBe("string");
    });

    it("stringified payload is valid JSON containing time, level, message", () => {
      const { c, calls } = makeConsoleSpy();
      const transport = sut.createStructuredTransport({ stringify: true }, c);
      transport.log(
        makeRecord({ time: "2026-01-01T00:00:00.000Z", level: "info", message: "hello" })
      );
      const raw = calls["log"]![0]![0] as string;
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      expect(parsed["time"]).toBe("2026-01-01T00:00:00.000Z");
      expect(parsed["level"]).toBe("info");
      expect(parsed["message"]).toBe("hello");
    });

    it("reserved keys in stringified output override context keys", () => {
      const { c, calls } = makeConsoleSpy();
      const transport = sut.createStructuredTransport({ stringify: true }, c);
      transport.log(
        makeRecord({
          time: "2026-01-01T00:00:00.000Z",
          level: "info",
          message: "real",
          context: { time: "bad", level: "bad", message: "bad" }
        })
      );
      const raw = calls["log"]![0]![0] as string;
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      expect(parsed["time"]).toBe("2026-01-01T00:00:00.000Z");
      expect(parsed["level"]).toBe("info");
      expect(parsed["message"]).toBe("real");
    });

    it("handles circular references safely in string mode", () => {
      const obj: Record<string, unknown> = { a: 1 };
      obj["self"] = obj;
      const { c, calls } = makeConsoleSpy();
      const transport = sut.createStructuredTransport({ stringify: true }, c);
      expect(() => transport.log(makeRecord({ context: obj }))).not.toThrow();
      const raw = calls["log"]![0]![0] as string;
      expect(raw).toContain("[Circular]");
    });

    it("handles BigInt values safely in string mode", () => {
      const { c, calls } = makeConsoleSpy();
      const transport = sut.createStructuredTransport({ stringify: true }, c);
      expect(() => transport.log(makeRecord({ context: { count: BigInt(99) } }))).not.toThrow();
      const raw = calls["log"]![0]![0] as string;
      expect(raw).toContain("99n");
    });
  });
});
