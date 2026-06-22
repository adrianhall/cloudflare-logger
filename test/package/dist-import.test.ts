/**
 * @file Package-level import and export validation tests.
 *
 * These tests run against the committed `dist/` output, not the TypeScript
 * source. They verify Phase 8 acceptance criteria from ENG_SPEC.md §25:
 *
 *  - `dist/index.js` can be imported directly.
 *  - `dist/react/index.js` can be imported directly when React is installed.
 *  - Exported symbols from the core entry point match the documented public API.
 *  - Exported symbols from the React entry point match the documented public API.
 *  - The core entry point does not import React.
 *  - Factory functions return the correct interface shapes.
 *  - `npm pack --dry-run --ignore-scripts` includes expected files (validated
 *    by the `check:pack` script; covered structurally here).
 */

import { execSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// Resolve paths relative to this file.
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const distIndex = path.join(root, "dist/index.js");
const distReactIndex = path.join(root, "dist/react/index.js");
const distHonoIndex = path.join(root, "dist/hono/index.js");

// ---------------------------------------------------------------------------
// Import built dist modules directly.
// ---------------------------------------------------------------------------

// These imports run against the real built output, not the TypeScript source.
// If dist/ is stale or the build fails, these will throw at module resolution
// time and the entire suite will fail with a clear error.
import * as core from "../../dist/index.js";
import * as reactEntry from "../../dist/react/index.js";
import * as honoEntry from "../../dist/hono/index.js";

// ---------------------------------------------------------------------------
// Core entry point — exported symbols
// ---------------------------------------------------------------------------

describe("dist/index.js — core exports", () => {
  it("exports createLogger as a function", () => {
    expect(typeof core.createLogger).toBe("function");
  });

  it("exports resolveLoggerConfig as a function", () => {
    expect(typeof core.resolveLoggerConfig).toBe("function");
  });

  it("exports serializeError as a function", () => {
    expect(typeof core.serializeError).toBe("function");
  });

  it("exports createBrowserTransport as a function", () => {
    expect(typeof core.createBrowserTransport).toBe("function");
  });

  it("exports createCaptureTransport as a function", () => {
    expect(typeof core.createCaptureTransport).toBe("function");
  });

  it("exports combineTransports as a function", () => {
    expect(typeof core.combineTransports).toBe("function");
  });

  it("exports createConsoleTransport as a function", () => {
    expect(typeof core.createConsoleTransport).toBe("function");
  });

  it("exports createSilentTransport as a function", () => {
    expect(typeof core.createSilentTransport).toBe("function");
  });

  it("exports createStructuredTransport as a function", () => {
    expect(typeof core.createStructuredTransport).toBe("function");
  });

  it("does not export internal helpers (safeStringify, getConsoleMethod, levelValue, LOG_LEVELS)", () => {
    const keys = Object.keys(core);
    expect(keys).not.toContain("safeStringify");
    expect(keys).not.toContain("replaceNonJsonValue");
    expect(keys).not.toContain("getConsoleMethod");
    expect(keys).not.toContain("levelValue");
    expect(keys).not.toContain("LOG_LEVELS");
    expect(keys).not.toContain("optionalField");
  });

  it("does not export React symbols (LoggingProvider, useLogger)", () => {
    const keys = Object.keys(core);
    expect(keys).not.toContain("LoggingProvider");
    expect(keys).not.toContain("useLogger");
  });

  it("does not export Hono symbols (loggingMiddleware)", () => {
    const keys = Object.keys(core);
    expect(keys).not.toContain("loggingMiddleware");
  });

  it("exports exactly the documented runtime symbols", () => {
    const runtimeExports = Object.keys(core).sort();
    expect(runtimeExports).toStrictEqual(
      [
        "combineTransports",
        "createBrowserTransport",
        "createCaptureTransport",
        "createConsoleTransport",
        "createLogger",
        "createSilentTransport",
        "createStructuredTransport",
        "resolveLoggerConfig",
        "serializeError"
      ].sort()
    );
  });
});

// ---------------------------------------------------------------------------
// Core entry point — React-free guarantee
// ---------------------------------------------------------------------------

describe("dist/index.js — React-free guarantee", () => {
  it("dist/index.js source does not contain a React import", () => {
    const source = readFileSync(distIndex, "utf8");
    // Neither a static nor dynamic import of 'react' should appear in the
    // core barrel or any module it re-exports transitively. We check the
    // barrel itself; the workers test project validates transitive safety.
    expect(source).not.toMatch(/['"]react['"]/);
  });

  it("dist/index.js source does not contain a Hono import", () => {
    const source = readFileSync(distIndex, "utf8");
    // The core entry point must not import the optional `hono` peer dependency.
    expect(source).not.toMatch(/['"]hono['"]/);
  });
});

// ---------------------------------------------------------------------------
// Hono entry point — exported symbols
// ---------------------------------------------------------------------------

describe("dist/hono/index.js — Hono exports", () => {
  it("exports loggingMiddleware as a function", () => {
    expect(typeof honoEntry.loggingMiddleware).toBe("function");
  });

  it("exports exactly the documented runtime symbols", () => {
    const runtimeExports = Object.keys(honoEntry).sort();
    expect(runtimeExports).toStrictEqual(["loggingMiddleware"].sort());
  });

  it("loggingMiddleware returns a middleware function", () => {
    const middleware = honoEntry.loggingMiddleware("test");
    expect(typeof middleware).toBe("function");
    // Hono middleware has arity (c, next).
    expect(middleware.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// React entry point — exported symbols
// ---------------------------------------------------------------------------

describe("dist/react/index.js — React exports", () => {
  it("exports LoggingProvider as a function", () => {
    expect(typeof reactEntry.LoggingProvider).toBe("function");
  });

  it("exports useLogger as a function", () => {
    expect(typeof reactEntry.useLogger).toBe("function");
  });

  it("exports exactly the documented runtime symbols", () => {
    const runtimeExports = Object.keys(reactEntry).sort();
    expect(runtimeExports).toStrictEqual(["LoggingProvider", "useLogger"].sort());
  });
});

// ---------------------------------------------------------------------------
// Core factory function smoke tests — verify correct interface shapes
// ---------------------------------------------------------------------------

describe("createLogger() smoke test", () => {
  it("returns an object with the Logger interface methods", () => {
    const transport = core.createSilentTransport();
    const logger = core.createLogger({ transport });
    expect(typeof logger.trace).toBe("function");
    expect(typeof logger.debug).toBe("function");
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.fatal).toBe("function");
    expect(typeof logger.child).toBe("function");
    expect(typeof logger.isLevelEnabled).toBe("function");
    expect(logger.level).toBe("info");
  });
});

describe("createCaptureTransport() smoke test", () => {
  it("returns a CaptureTransport with records, clear, and find", () => {
    const capture = core.createCaptureTransport();
    expect(Array.isArray(capture.records)).toBe(true);
    expect(typeof capture.clear).toBe("function");
    expect(typeof capture.find).toBe("function");
  });

  it("captures records via createLogger", () => {
    const capture = core.createCaptureTransport();
    const logger = core.createLogger({ transport: capture });
    logger.info("hello from dist");
    expect(capture.records).toHaveLength(1);
    expect(capture.records[0]?.message).toBe("hello from dist");
    expect(capture.records[0]?.level).toBe("info");
  });
});

describe("resolveLoggerConfig() smoke test", () => {
  it("returns level and transport for test/worker", () => {
    const config = core.resolveLoggerConfig("test", "worker");
    expect(config.level).toBe("trace");
    expect(typeof config.transport.log).toBe("function");
  });

  it("returns level and transport for production/browser", () => {
    const config = core.resolveLoggerConfig("production", "browser");
    expect(config.level).toBe("warn");
    expect(typeof config.transport.log).toBe("function");
  });
});

describe("serializeError() smoke test", () => {
  it("serializes an Error to a plain object", () => {
    const err = new Error("boom");
    const result = core.serializeError(err);
    expect(result).not.toBeInstanceOf(Error);
    expect(typeof result).toBe("object");
    expect((result as Record<string, unknown>)["message"]).toBe("boom");
  });

  it("returns non-Error values unchanged", () => {
    expect(core.serializeError("plain string")).toBe("plain string");
    expect(core.serializeError(42)).toBe(42);
    expect(core.serializeError(null)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// npm pack — expected files present
// ---------------------------------------------------------------------------

describe("npm pack --dry-run", () => {
  it("includes dist/index.js", () => {
    const output = execSync("npm pack --dry-run --ignore-scripts 2>&1", {
      cwd: root,
      encoding: "utf8"
    });
    expect(output).toContain("dist/index.js");
  });

  it("includes dist/react/index.js", () => {
    const output = execSync("npm pack --dry-run --ignore-scripts 2>&1", {
      cwd: root,
      encoding: "utf8"
    });
    expect(output).toContain("dist/react/index.js");
  });

  it("includes README.md", () => {
    const output = execSync("npm pack --dry-run --ignore-scripts 2>&1", {
      cwd: root,
      encoding: "utf8"
    });
    expect(output).toContain("README.md");
  });

  it("includes LICENSE", () => {
    const output = execSync("npm pack --dry-run --ignore-scripts 2>&1", {
      cwd: root,
      encoding: "utf8"
    });
    expect(output).toContain("LICENSE");
  });

  it("includes skills/cloudflare-logger/SKILL.md", () => {
    const output = execSync("npm pack --dry-run --ignore-scripts 2>&1", {
      cwd: root,
      encoding: "utf8"
    });
    expect(output).toContain("skills/cloudflare-logger/SKILL.md");
  });

  it("includes src/ source files (so source maps resolve in consumers)", () => {
    const output = execSync("npm pack --dry-run --ignore-scripts 2>&1", {
      cwd: root,
      encoding: "utf8"
    });
    expect(output).toMatch(/\bsrc\//);
    expect(output).toContain("src/logger.ts");
    expect(output).toContain("src/index.ts");
  });

  it("does not include test/ files", () => {
    const output = execSync("npm pack --dry-run --ignore-scripts 2>&1", {
      cwd: root,
      encoding: "utf8"
    });
    expect(output).not.toMatch(/\btest\//);
  });

  it("includes all expected transport dist files", () => {
    const output = execSync("npm pack --dry-run --ignore-scripts 2>&1", {
      cwd: root,
      encoding: "utf8"
    });
    const expectedTransports = [
      "dist/transports/browser.js",
      "dist/transports/capture.js",
      "dist/transports/combine.js",
      "dist/transports/console.js",
      "dist/transports/silent.js",
      "dist/transports/structured.js"
    ];
    for (const file of expectedTransports) {
      expect(output).toContain(file);
    }
  });

  it("includes all expected react dist files", () => {
    const output = execSync("npm pack --dry-run --ignore-scripts 2>&1", {
      cwd: root,
      encoding: "utf8"
    });
    const expectedReact = [
      "dist/react/index.js",
      "dist/react/LoggingProvider.js",
      "dist/react/useLogger.js",
      "dist/react/context.js"
    ];
    for (const file of expectedReact) {
      expect(output).toContain(file);
    }
  });

  it("includes all expected hono dist files", () => {
    const output = execSync("npm pack --dry-run --ignore-scripts 2>&1", {
      cwd: root,
      encoding: "utf8"
    });
    const expectedHono = [
      "dist/hono/index.js",
      "dist/hono/middleware.js",
      "dist/hono/preview.js",
      "dist/hono/headers.js",
      "dist/hono/types.js"
    ];
    for (const file of expectedHono) {
      expect(output).toContain(file);
    }
  });
});

// ---------------------------------------------------------------------------
// dist/ path resolution — verify absolute paths exist
// ---------------------------------------------------------------------------

describe("dist/ file existence", () => {
  it("dist/index.js exists and is a file", () => {
    expect(statSync(distIndex).isFile()).toBe(true);
  });

  it("dist/react/index.js exists and is a file", () => {
    expect(statSync(distReactIndex).isFile()).toBe(true);
  });

  it("dist/hono/index.js exists and is a file", () => {
    expect(statSync(distHonoIndex).isFile()).toBe(true);
  });

  it("dist/index.d.ts exists", () => {
    const dts = path.join(root, "dist/index.d.ts");
    expect(statSync(dts).isFile()).toBe(true);
  });

  it("dist/react/index.d.ts exists", () => {
    const dts = path.join(root, "dist/react/index.d.ts");
    expect(statSync(dts).isFile()).toBe(true);
  });

  it("dist/hono/index.d.ts exists", () => {
    const dts = path.join(root, "dist/hono/index.d.ts");
    expect(statSync(dts).isFile()).toBe(true);
  });
});
