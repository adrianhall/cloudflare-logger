/**
 * @file Tests for `src/resolve.ts`.
 *
 * Covers all required cases from ENG_SPEC.md §20.1 (Resolve config) and the
 * full policy table in §15:
 *
 *  | Environment   | Runtime   | Level   | Transport  |
 *  |---------------|-----------|---------|------------|
 *  | test          | browser   | trace   | capture    |
 *  | test          | worker    | trace   | capture    |
 *  | development   | browser   | info    | browser    |
 *  | development   | worker    | debug   | console    |
 *  | production    | browser   | warn    | browser    |
 *  | production    | worker    | warn    | structured |
 *  | unknown       | browser   | warn    | browser    |
 *  | unknown       | worker    | warn    | structured |
 *
 *  Additional cases:
 *  - Unknown environment maps to production behavior.
 *  - Undefined environment maps to production behavior.
 *  - Each call returns a fresh transport instance.
 *  - `detectRuntime()` is not exported.
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

/**
 * Check whether the transport silently captures records (capture transport
 * behavior: no console output, but the record is stored).
 */
function isCaptureTransport(
  transport: ReturnType<typeof sut.resolveLoggerConfig>["transport"]
): boolean {
  // Cast to the extended CaptureTransport interface shape (duck type check).
  const t = transport as { records?: unknown; clear?: unknown };
  return typeof t.records !== "undefined" && typeof t.clear === "function";
}

/**
 * Check whether the transport calls console.log or console.error for an info
 * record — distinguishes console transport from structured transport by which
 * method name is used.
 *
 * Structured transport uses console.log for info.
 * Console transport uses console.log for info as well — so we differentiate
 * them by passing a warn-level record: structured uses console.warn, console
 * transport also uses console.error for warn.  We instead discriminate by
 * calling an info-level record and checking no %c badge is emitted (browser),
 * vs. a one-liner string (console), vs. a plain object (structured).
 *
 * Simpler: we check the console method call args for info-level:
 *  - browser transport: first arg is "%cINFO" (starts with "%c")
 *  - console transport: first arg is a plain string line with no "%c"
 *  - structured transport: first arg is a plain object
 */
function identifyTransport(
  transport: ReturnType<typeof sut.resolveLoggerConfig>["transport"]
): "capture" | "browser" | "console" | "structured" | "unknown" {
  if (isCaptureTransport(transport)) {
    return "capture";
  }

  const record = makeRecord({ level: "info", levelValue: 30, message: "probe" });
  const captured: unknown[][] = [];

  const methods = ["debug", "info", "log", "warn", "error"] as const;
  const spies = methods.map((m) =>
    vi.spyOn(console, m).mockImplementation((...args: unknown[]) => {
      captured.push(args);
    })
  );

  try {
    transport.log(record);
  } finally {
    spies.forEach((s) => s.mockRestore());
  }

  if (captured.length === 0) {
    return "unknown";
  }

  const firstArg = captured[0]?.[0];

  if (typeof firstArg === "string" && firstArg.startsWith("%c")) {
    return "browser";
  }

  if (typeof firstArg === "object" && firstArg !== null && !Array.isArray(firstArg)) {
    return "structured";
  }

  if (typeof firstArg === "string") {
    return "console";
  }

  return "unknown";
}

// ---------------------------------------------------------------------------
// Public API surface
// ---------------------------------------------------------------------------

describe("module exports", () => {
  it("exports resolveLoggerConfig", () => {
    expect(typeof sut.resolveLoggerConfig).toBe("function");
  });

  it("does not export detectRuntime", () => {
    expect("detectRuntime" in sut).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Policy table — test environment (both runtimes collapse to capture/trace)
// ---------------------------------------------------------------------------

describe('resolveLoggerConfig("test", runtime)', () => {
  it('test + browser → level "trace"', () => {
    const { level } = sut.resolveLoggerConfig("test", "browser");
    expect(level).toBe("trace");
  });

  it("test + browser → capture transport", () => {
    const { transport } = sut.resolveLoggerConfig("test", "browser");
    expect(identifyTransport(transport)).toBe("capture");
  });

  it('test + worker → level "trace"', () => {
    const { level } = sut.resolveLoggerConfig("test", "worker");
    expect(level).toBe("trace");
  });

  it("test + worker → capture transport", () => {
    const { transport } = sut.resolveLoggerConfig("test", "worker");
    expect(identifyTransport(transport)).toBe("capture");
  });
});

// ---------------------------------------------------------------------------
// Policy table — development
// ---------------------------------------------------------------------------

describe('resolveLoggerConfig("development", runtime)', () => {
  it('development + browser → level "info"', () => {
    const { level } = sut.resolveLoggerConfig("development", "browser");
    expect(level).toBe("info");
  });

  it("development + browser → browser transport", () => {
    const { transport } = sut.resolveLoggerConfig("development", "browser");
    expect(identifyTransport(transport)).toBe("browser");
  });

  it('development + worker → level "debug"', () => {
    const { level } = sut.resolveLoggerConfig("development", "worker");
    expect(level).toBe("debug");
  });

  it("development + worker → console transport", () => {
    const { transport } = sut.resolveLoggerConfig("development", "worker");
    expect(identifyTransport(transport)).toBe("console");
  });
});

// ---------------------------------------------------------------------------
// Policy table — production
// ---------------------------------------------------------------------------

describe('resolveLoggerConfig("production", runtime)', () => {
  it('production + browser → level "warn"', () => {
    const { level } = sut.resolveLoggerConfig("production", "browser");
    expect(level).toBe("warn");
  });

  it("production + browser → browser transport", () => {
    const { transport } = sut.resolveLoggerConfig("production", "browser");
    expect(identifyTransport(transport)).toBe("browser");
  });

  it('production + worker → level "warn"', () => {
    const { level } = sut.resolveLoggerConfig("production", "worker");
    expect(level).toBe("warn");
  });

  it("production + worker → structured transport", () => {
    const { transport } = sut.resolveLoggerConfig("production", "worker");
    expect(identifyTransport(transport)).toBe("structured");
  });
});

// ---------------------------------------------------------------------------
// Policy table — unknown environment (maps to production)
// ---------------------------------------------------------------------------

describe("resolveLoggerConfig(unknown environment, runtime)", () => {
  it('unknown env + browser → level "warn"', () => {
    const { level } = sut.resolveLoggerConfig("staging", "browser");
    expect(level).toBe("warn");
  });

  it("unknown env + browser → browser transport", () => {
    const { transport } = sut.resolveLoggerConfig("staging", "browser");
    expect(identifyTransport(transport)).toBe("browser");
  });

  it('unknown env + worker → level "warn"', () => {
    const { level } = sut.resolveLoggerConfig("staging", "worker");
    expect(level).toBe("warn");
  });

  it("unknown env + worker → structured transport", () => {
    const { transport } = sut.resolveLoggerConfig("staging", "worker");
    expect(identifyTransport(transport)).toBe("structured");
  });
});

// ---------------------------------------------------------------------------
// Policy table — undefined environment (maps to production)
// ---------------------------------------------------------------------------

describe("resolveLoggerConfig(undefined, runtime)", () => {
  it('undefined env + browser → level "warn"', () => {
    const { level } = sut.resolveLoggerConfig(undefined, "browser");
    expect(level).toBe("warn");
  });

  it("undefined env + browser → browser transport", () => {
    const { transport } = sut.resolveLoggerConfig(undefined, "browser");
    expect(identifyTransport(transport)).toBe("browser");
  });

  it('undefined env + worker → level "warn"', () => {
    const { level } = sut.resolveLoggerConfig(undefined, "worker");
    expect(level).toBe("warn");
  });

  it("undefined env + worker → structured transport", () => {
    const { transport } = sut.resolveLoggerConfig(undefined, "worker");
    expect(identifyTransport(transport)).toBe("structured");
  });
});

// ---------------------------------------------------------------------------
// Fresh transport on each call
// ---------------------------------------------------------------------------

describe("fresh transport per call", () => {
  it("two test calls return distinct capture transport instances", () => {
    const a = sut.resolveLoggerConfig("test", "worker");
    const b = sut.resolveLoggerConfig("test", "worker");
    expect(a.transport).not.toBe(b.transport);
  });

  it("two development+browser calls return distinct browser transport instances", () => {
    const a = sut.resolveLoggerConfig("development", "browser");
    const b = sut.resolveLoggerConfig("development", "browser");
    expect(a.transport).not.toBe(b.transport);
  });

  it("two production+worker calls return distinct structured transport instances", () => {
    const a = sut.resolveLoggerConfig("production", "worker");
    const b = sut.resolveLoggerConfig("production", "worker");
    expect(a.transport).not.toBe(b.transport);
  });

  it("capture transports from separate calls have independent record storage", () => {
    const a = sut.resolveLoggerConfig("test", "worker");
    const b = sut.resolveLoggerConfig("test", "worker");

    // Cast to CaptureTransport duck type.
    const ca = a.transport as { records: readonly unknown[]; log(r: LogRecord): void };
    const cb = b.transport as { records: readonly unknown[]; log(r: LogRecord): void };

    ca.log(makeRecord({ message: "only in a" }));

    expect(ca.records).toHaveLength(1);
    expect(cb.records).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Returned config shape
// ---------------------------------------------------------------------------

describe("returned config shape", () => {
  it("returns an object with level and transport properties", () => {
    const config = sut.resolveLoggerConfig("production", "worker");
    expect(config).toHaveProperty("level");
    expect(config).toHaveProperty("transport");
  });

  it("transport has a log method", () => {
    const { transport } = sut.resolveLoggerConfig("production", "worker");
    expect(typeof transport.log).toBe("function");
  });
});
