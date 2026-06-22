/**
 * @file Tests for `src/hono/preview.ts`.
 *
 * Covers byte-accurate body truncation and the best-effort response reader,
 * including the failure path where reading the body throws.
 */

import { describe, expect, it } from "vitest";
import * as sut from "../../../src/hono/preview.js";

describe("previewResponseBody()", () => {
  it("returns the body unchanged when it is within the byte limit", () => {
    expect(sut.previewResponseBody("short body")).toBe("short body");
  });

  it("returns the body unchanged when exactly at the byte limit", () => {
    const body = "x".repeat(64);
    expect(sut.previewResponseBody(body)).toBe(body);
  });

  it("truncates to the byte limit and appends '...' when longer", () => {
    const body = "x".repeat(100);
    const result = sut.previewResponseBody(body);
    expect(result).toBe("x".repeat(64) + "...");
  });

  it("honors a custom byte limit", () => {
    expect(sut.previewResponseBody("abcdef", 3)).toBe("abc...");
  });
});

describe("readResponseBodyPreview()", () => {
  it("reads and previews a normal response body without consuming it", async () => {
    const response = new Response("hello world");
    const preview = await sut.readResponseBodyPreview(response);
    expect(preview).toBe("hello world");
    // The original response body is still readable (clone was used).
    await expect(response.text()).resolves.toBe("hello world");
  });

  it("truncates a long response body", async () => {
    const response = new Response("y".repeat(100));
    expect(await sut.readResponseBodyPreview(response)).toBe("y".repeat(64) + "...");
  });

  it("returns an empty string when reading the body throws", async () => {
    const broken = {
      clone() {
        throw new Error("cannot clone");
      }
    } as unknown as Response;
    expect(await sut.readResponseBodyPreview(broken)).toBe("");
  });
});
