/**
 * @file Tests for `src/hono/headers.ts`.
 *
 * Covers cookie-name extraction, request `Cookie` header parsing, and the
 * header redaction policy (cookie/set-cookie omitted; sensitive headers reduced
 * to a presence indicator; other headers preserved).
 */

import { describe, expect, it } from "vitest";
import * as sut from "../../../src/hono/headers.js";

describe("cookieName()", () => {
  it("returns the name before the first '='", () => {
    expect(sut.cookieName("sessionId=abc123; Path=/; HttpOnly")).toBe("sessionId");
  });

  it("trims surrounding whitespace", () => {
    expect(sut.cookieName("  csrf=xyz")).toBe("csrf");
  });

  it("returns the whole trimmed string when there is no '='", () => {
    expect(sut.cookieName("  bare  ")).toBe("bare");
  });
});

describe("parseCookieHeader()", () => {
  it("returns an empty array for undefined", () => {
    expect(sut.parseCookieHeader(undefined)).toStrictEqual([]);
  });

  it("returns an empty array for null", () => {
    expect(sut.parseCookieHeader(null)).toStrictEqual([]);
  });

  it("returns an empty array for an empty string", () => {
    expect(sut.parseCookieHeader("")).toStrictEqual([]);
  });

  it("extracts names from multiple cookies", () => {
    expect(sut.parseCookieHeader("a=1; b=2; c=3")).toStrictEqual(["a", "b", "c"]);
  });

  it("ignores empty segments", () => {
    expect(sut.parseCookieHeader("a=1;; b=2;")).toStrictEqual(["a", "b"]);
  });
});

describe("redactHeaders()", () => {
  it("omits the request cookie header", () => {
    const headers = new Headers({ "cookie": "a=1", "content-type": "text/plain" });
    expect(sut.redactHeaders(headers)).toStrictEqual({ "content-type": "text/plain" });
  });

  it("omits the response set-cookie header", () => {
    const headers = new Headers();
    headers.append("set-cookie", "a=1");
    headers.append("content-type", "text/html");
    expect(sut.redactHeaders(headers)).toStrictEqual({ "content-type": "text/html" });
  });

  it("redacts the authorization header to a presence indicator", () => {
    const headers = new Headers({ authorization: "Bearer super-secret-token" });
    expect(sut.redactHeaders(headers)).toStrictEqual({ authorization: "[redacted]" });
  });

  it("redacts the cf-access-jwt-authorization header", () => {
    const headers = new Headers({ "cf-access-jwt-authorization": "eyJhbGci..." });
    expect(sut.redactHeaders(headers)).toStrictEqual({
      "cf-access-jwt-authorization": "[redacted]"
    });
  });

  it("matches sensitive header names case-insensitively", () => {
    const headers = new Headers({ Authorization: "Bearer x" });
    expect(sut.redactHeaders(headers)).toStrictEqual({ authorization: "[redacted]" });
  });

  it("preserves non-sensitive headers verbatim", () => {
    const headers = new Headers({ "x-custom": "value", "accept": "application/json" });
    expect(sut.redactHeaders(headers)).toStrictEqual({
      "x-custom": "value",
      "accept": "application/json"
    });
  });
});
