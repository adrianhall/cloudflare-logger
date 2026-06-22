/**
 * @file Tests for `src/react/` — `LoggingProvider` and `useLogger`.
 *
 * Covers all required cases from ENG_SPEC.md §20.1 (React):
 *  - Provider supplies logger.
 *  - Hook returns logger.
 *  - Hook throws outside provider.
 *  - Hook creates child logger when bindings are supplied.
 *  - Child records include bindings.
 *  - Logging routes through provided logger transport.
 *  - Documentation examples avoid render-time logging.
 *
 * These tests run in jsdom (see test/browser/vitest.config.ts).
 */

import { useEffect, useRef } from "react";
import { act, render, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createLogger } from "../../src/logger.js";
import { createCaptureTransport } from "../../src/transports/capture.js";
import { LoggingProvider } from "../../src/react/LoggingProvider.js";
import { useLogger } from "../../src/react/useLogger.js";
import type { LogContext, Logger } from "../../src/types.js";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Create a logger backed by a capture transport for assertion. */
function makeTestLogger(level: "trace" | "debug" | "info" = "trace") {
  const transport = createCaptureTransport();
  const logger = createLogger({ transport, level });
  return { logger, transport };
}

// ---------------------------------------------------------------------------
// LoggingProvider
// ---------------------------------------------------------------------------

describe("LoggingProvider", () => {
  it("renders its children", () => {
    const { logger } = makeTestLogger();
    const { getByText } = render(
      <LoggingProvider logger={logger}>
        <span>hello</span>
      </LoggingProvider>
    );
    expect(getByText("hello")).toBeDefined();
  });

  it("supplies the logger to descendants via useLogger()", () => {
    const { logger } = makeTestLogger();

    let capturedLogger: Logger | undefined;

    function Consumer() {
      capturedLogger = useLogger();
      return null;
    }

    render(
      <LoggingProvider logger={logger}>
        <Consumer />
      </LoggingProvider>
    );

    expect(capturedLogger).toBe(logger);
  });
});

// ---------------------------------------------------------------------------
// useLogger — outside provider
// ---------------------------------------------------------------------------

describe("useLogger() outside provider", () => {
  it("throws a clear error when called without a LoggingProvider", () => {
    expect(() => renderHook(() => useLogger())).toThrow(/LoggingProvider/);
  });

  it("error message mentions useLogger", () => {
    expect(() => renderHook(() => useLogger())).toThrow(/useLogger/);
  });
});

// ---------------------------------------------------------------------------
// useLogger — inside provider, no bindings
// ---------------------------------------------------------------------------

describe("useLogger() without bindings", () => {
  it("returns the provider's logger directly", () => {
    const { logger } = makeTestLogger();
    const { result } = renderHook(() => useLogger(), {
      wrapper: ({ children }) => <LoggingProvider logger={logger}>{children}</LoggingProvider>
    });
    expect(result.current).toBe(logger);
  });

  it("routes log calls through the provider's transport", () => {
    const { logger, transport } = makeTestLogger();

    function Consumer() {
      const log = useLogger();
      useEffect(() => {
        log.info("test message");
      }, [log]);
      return null;
    }

    act(() => {
      render(
        <LoggingProvider logger={logger}>
          <Consumer />
        </LoggingProvider>
      );
    });

    expect(transport.records).toHaveLength(1);
    expect(transport.records[0]!.message).toBe("test message");
    expect(transport.records[0]!.level).toBe("info");
  });
});

// ---------------------------------------------------------------------------
// useLogger — with bindings (child logger)
// ---------------------------------------------------------------------------

describe("useLogger(bindings)", () => {
  it("returns a child logger (not the provider logger itself)", () => {
    const { logger } = makeTestLogger();

    let capturedLogger: Logger | undefined;

    function Consumer() {
      capturedLogger = useLogger({ component: "Widget" });
      return null;
    }

    render(
      <LoggingProvider logger={logger}>
        <Consumer />
      </LoggingProvider>
    );

    expect(capturedLogger).not.toBe(logger);
  });

  it("child logger records include the bound context", () => {
    const { logger, transport } = makeTestLogger();

    function Consumer() {
      const log = useLogger({ component: "Widget" });
      useEffect(() => {
        log.info("mounted");
      }, [log]);
      return null;
    }

    act(() => {
      render(
        <LoggingProvider logger={logger}>
          <Consumer />
        </LoggingProvider>
      );
    });

    expect(transport.records).toHaveLength(1);
    expect(transport.records[0]!.context).toMatchObject({ component: "Widget" });
    expect(transport.records[0]!.message).toBe("mounted");
  });

  it("child logger records include per-call context merged with bindings", () => {
    const { logger, transport } = makeTestLogger();

    function Consumer() {
      const log = useLogger({ component: "Widget" });
      useEffect(() => {
        log.warn("something happened", { reason: "network" });
      }, [log]);
      return null;
    }

    act(() => {
      render(
        <LoggingProvider logger={logger}>
          <Consumer />
        </LoggingProvider>
      );
    });

    expect(transport.records).toHaveLength(1);
    expect(transport.records[0]!.context).toMatchObject({ component: "Widget", reason: "network" });
  });

  it("per-call context wins over child bindings on key collision", () => {
    const { logger, transport } = makeTestLogger();

    function Consumer() {
      const log = useLogger({ source: "bound" });
      useEffect(() => {
        log.info("collision", { source: "call" });
      }, [log]);
      return null;
    }

    act(() => {
      render(
        <LoggingProvider logger={logger}>
          <Consumer />
        </LoggingProvider>
      );
    });

    expect(transport.records[0]!.context["source"]).toBe("call");
  });

  it("routes child logger calls through the provider's transport", () => {
    const { logger, transport } = makeTestLogger();

    function Consumer() {
      const log = useLogger({ component: "Widget" });
      useEffect(() => {
        log.debug("debug message");
      }, [log]);
      return null;
    }

    act(() => {
      render(
        <LoggingProvider logger={logger}>
          <Consumer />
        </LoggingProvider>
      );
    });

    expect(transport.find("debug")).toHaveLength(1);
  });

  it("memoizes child logger when stable bindings object is provided", () => {
    const { logger } = makeTestLogger();

    const stableBindings: LogContext = { component: "Widget" };
    const childLoggers: Logger[] = [];

    function Consumer() {
      const log = useLogger(stableBindings);
      childLoggers.push(log);
      return null;
    }

    const { rerender } = render(
      <LoggingProvider logger={logger}>
        <Consumer />
      </LoggingProvider>
    );

    rerender(
      <LoggingProvider logger={logger}>
        <Consumer />
      </LoggingProvider>
    );

    expect(childLoggers.length).toBeGreaterThanOrEqual(2);
    expect(childLoggers[0]).toBe(childLoggers[1]);
  });

  it("creates a new child logger when bindings object reference changes", () => {
    const { logger } = makeTestLogger();

    const childLoggers: Logger[] = [];

    function Consumer({ bindings }: { bindings: LogContext }) {
      const log = useLogger(bindings);
      childLoggers.push(log);
      return null;
    }

    const { rerender } = render(
      <LoggingProvider logger={logger}>
        <Consumer bindings={{ component: "A" }} />
      </LoggingProvider>
    );

    rerender(
      <LoggingProvider logger={logger}>
        <Consumer bindings={{ component: "B" }} />
      </LoggingProvider>
    );

    expect(childLoggers.length).toBeGreaterThanOrEqual(2);
    expect(childLoggers[0]).not.toBe(childLoggers[childLoggers.length - 1]);
  });
});

// ---------------------------------------------------------------------------
// Documentation example — no render-time logging
// ---------------------------------------------------------------------------

describe("documentation example — no render-time logging", () => {
  it("logging in useEffect does not log during render", () => {
    const { logger, transport } = makeTestLogger();

    // recordCountAtRender captures the transport length at render time (before
    // any effects fire). The effect then asserts that value was 0, proving no
    // logging happened during the render phase.
    let recordCountAtRender = -1;

    function Widget() {
      const countRef = useRef(transport.records.length);
      useEffect(() => {
        recordCountAtRender = countRef.current;
      });
      return null;
    }

    function LoggingWidget() {
      const log = useLogger();
      useEffect(() => {
        log.info("mounted from effect");
      }, [log]);
      return null;
    }

    act(() => {
      render(
        <LoggingProvider logger={logger}>
          <Widget />
          <LoggingWidget />
        </LoggingProvider>
      );
    });

    expect(transport.records).toHaveLength(1);
    expect(transport.records[0]!.message).toBe("mounted from effect");
    expect(recordCountAtRender).toBe(0);
  });

  it("spec example: Widget logs info('mounted') in useEffect with component binding", () => {
    const { logger, transport } = makeTestLogger();

    function Widget() {
      const log = useLogger({ component: "Widget" });
      useEffect(() => {
        log.info("mounted");
      }, [log]);
      return null;
    }

    act(() => {
      render(
        <LoggingProvider logger={logger}>
          <Widget />
        </LoggingProvider>
      );
    });

    const records = transport.find("info");
    expect(records).toHaveLength(1);
    expect(records[0]!.message).toBe("mounted");
    expect(records[0]!.context).toMatchObject({ component: "Widget" });
  });
});

// ---------------------------------------------------------------------------
// Multiple consumers at different nesting levels
// ---------------------------------------------------------------------------

describe("multiple consumers", () => {
  it("all consumers receive the same provider logger", () => {
    const { logger } = makeTestLogger();
    const loggers: Logger[] = [];

    function ConsumerA() {
      loggers.push(useLogger());
      return null;
    }

    function ConsumerB() {
      loggers.push(useLogger());
      return null;
    }

    render(
      <LoggingProvider logger={logger}>
        <ConsumerA />
        <ConsumerB />
      </LoggingProvider>
    );

    expect(loggers).toHaveLength(2);
    expect(loggers[0]).toBe(logger);
    expect(loggers[1]).toBe(logger);
  });

  it("nested providers shadow the outer logger", () => {
    const outer = makeTestLogger();
    const inner = makeTestLogger();

    let outerLogger: Logger | undefined;
    let innerLogger: Logger | undefined;

    function OuterConsumer() {
      outerLogger = useLogger();
      return null;
    }

    function InnerConsumer() {
      innerLogger = useLogger();
      return null;
    }

    render(
      <LoggingProvider logger={outer.logger}>
        <OuterConsumer />
        <LoggingProvider logger={inner.logger}>
          <InnerConsumer />
        </LoggingProvider>
      </LoggingProvider>
    );

    expect(outerLogger).toBe(outer.logger);
    expect(innerLogger).toBe(inner.logger);
    expect(outerLogger).not.toBe(innerLogger);
  });
});
