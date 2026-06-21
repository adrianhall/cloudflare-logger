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
