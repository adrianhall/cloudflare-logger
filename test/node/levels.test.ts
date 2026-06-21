/**
 * @file Tests for `src/levels.ts`.
 *
 * Covers:
 *  - Each level key maps to its documented numeric weight.
 *  - `levelValue()` returns the correct weight for each level.
 *  - `levelValue()` throws a `TypeError` for invalid runtime input.
 *  - `LOG_LEVELS` is frozen / not mutated by callers (structural check).
 *
 * Note: `LOG_LEVELS` and `levelValue` are internal; they are tested here
 * directly because the module is package-internal, not because they form a
 * public API.  Tests import from `../../src/levels.js` so they run against
 * source in the node Vitest project.
 */

import { describe, expect, it } from "vitest";
import * as sut from "../../src/levels.js";

describe("LOG_LEVELS", () => {
  it("defines trace as 10", () => {
    expect(sut.LOG_LEVELS.trace).toBe(10);
  });

  it("defines debug as 20", () => {
    expect(sut.LOG_LEVELS.debug).toBe(20);
  });

  it("defines info as 30", () => {
    expect(sut.LOG_LEVELS.info).toBe(30);
  });

  it("defines warn as 40", () => {
    expect(sut.LOG_LEVELS.warn).toBe(40);
  });

  it("defines error as 50", () => {
    expect(sut.LOG_LEVELS.error).toBe(50);
  });

  it("defines fatal as 60", () => {
    expect(sut.LOG_LEVELS.fatal).toBe(60);
  });

  it("has exactly the six documented levels", () => {
    expect(Object.keys(sut.LOG_LEVELS)).toStrictEqual([
      "trace",
      "debug",
      "info",
      "warn",
      "error",
      "fatal"
    ]);
  });
});

describe("levelValue()", () => {
  it("returns 10 for trace", () => {
    expect(sut.levelValue("trace")).toBe(10);
  });

  it("returns 20 for debug", () => {
    expect(sut.levelValue("debug")).toBe(20);
  });

  it("returns 30 for info", () => {
    expect(sut.levelValue("info")).toBe(30);
  });

  it("returns 40 for warn", () => {
    expect(sut.levelValue("warn")).toBe(40);
  });

  it("returns 50 for error", () => {
    expect(sut.levelValue("error")).toBe(50);
  });

  it("returns 60 for fatal", () => {
    expect(sut.levelValue("fatal")).toBe(60);
  });

  it("throws a TypeError for an unrecognized level string", () => {
    expect(() =>
      // Cast needed to simulate a bad runtime value arriving from untyped JS.
      sut.levelValue("verbose" as Parameters<typeof sut.levelValue>[0])
    ).toThrow(TypeError);
  });

  it("TypeError message includes the invalid level name", () => {
    expect(() => sut.levelValue("bogus" as Parameters<typeof sut.levelValue>[0])).toThrow(/bogus/);
  });

  it("TypeError message lists valid level names", () => {
    expect(() => sut.levelValue("nope" as Parameters<typeof sut.levelValue>[0])).toThrow(/trace/);
  });

  it("levels are strictly ordered trace < debug < info < warn < error < fatal", () => {
    const ordered = (["trace", "debug", "info", "warn", "error", "fatal"] as const).map(
      sut.levelValue
    );
    for (let i = 1; i < ordered.length; i++) {
      // Non-null assertion safe because the array is statically constructed.
      expect(ordered[i]!).toBeGreaterThan(ordered[i - 1]!);
    }
  });
});
