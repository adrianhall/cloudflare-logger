/**
 * @file Worker-runtime integration tests for `src/hono/middleware.ts`.
 *
 * Exercises `loggingMiddleware` on a real Hono app under workerd, covering:
 *   - request/response trace logging with an injected capture transport,
 *   - environment resolution from the argument and from `c.env.ENVIRONMENT`,
 *   - correlation id from the `CF-Ray` header and the `crypto.randomUUID()`
 *     fallback,
 *   - header redaction, cookie-name-only logging, and body truncation,
 *   - `c.var.LOGGER` being set for downstream handlers.
 */

import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { loggingMiddleware } from "../../src/hono/middleware.js";
import type { LoggerBindings, LoggerVariables } from "../../src/hono/types.js";
import { createCaptureTransport } from "../../src/transports/capture.js";

type LoggerEnv = { Bindings: LoggerBindings; Variables: LoggerVariables };

describe("loggingMiddleware() — Workers runtime", () => {
  it("logs request and response at trace with an injected capture transport", async () => {
    const capture = createCaptureTransport();
    const app = new Hono<LoggerEnv>();
    app.use("*", loggingMiddleware({ environment: "test", transport: capture }));
    app.get("/hello", (c) => c.text("hello"));

    const res = await app.request("/hello");
    expect(res.status).toBe(200);

    const traces = capture.find("trace");
    expect(traces).toHaveLength(2);

    const request = traces[0]!;
    expect(request.message).toBe("request");
    expect(request.context["method"]).toBe("GET");
    expect(String(request.context["url"])).toContain("/hello");
    // No CF-Ray header → a generated UUID correlation id.
    expect(request.context["correlationId"]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );

    const response = traces[1]!;
    expect(response.message).toBe("response");
    expect(response.context["status"]).toBe(200);
    expect(response.context["body"]).toBe("hello");
    expect(typeof response.context["durationMs"]).toBe("number");
    // Correlation id is shared between request and response (child bindings).
    expect(response.context["correlationId"]).toBe(request.context["correlationId"]);
  });

  it("falls back to c.env.ENVIRONMENT and reads correlation id from CF-Ray", async () => {
    const capture = createCaptureTransport();
    const app = new Hono<LoggerEnv>();
    // No environment in options → resolved from c.env.ENVIRONMENT; level forced
    // to trace so the request/response logs are captured.
    app.use("*", loggingMiddleware({ transport: capture, level: "trace" }));
    app.get("/", (c) => c.text("ok"));

    const res = await app.request(
      "/",
      { headers: { "CF-Ray": "ray-abc-123" } },
      {
        ENVIRONMENT: "production"
      }
    );
    expect(res.status).toBe(200);

    const request = capture.find("trace")[0]!;
    expect(request.context["correlationId"]).toBe("ray-abc-123");
  });

  it("accepts an environment string and sets c.var.LOGGER for downstream handlers", async () => {
    const app = new Hono<LoggerEnv>();
    let loggerIsUsable = false;
    app.use("*", loggingMiddleware("test"));
    app.get("/", (c) => {
      loggerIsUsable = typeof c.var.LOGGER.info === "function";
      return c.text("ok");
    });

    const res = await app.request("/");
    expect(res.status).toBe(200);
    expect(loggerIsUsable).toBe(true);
  });

  it("works with no argument, reading environment lazily (defaults to production)", async () => {
    const app = new Hono<LoggerEnv>();
    app.use("*", loggingMiddleware());
    app.get("/", (c) => c.text("ok"));

    const res = await app.request("/");
    expect(res.status).toBe(200);
  });

  it("redacts sensitive headers and logs only cookie names", async () => {
    const capture = createCaptureTransport();
    const app = new Hono<LoggerEnv>();
    app.use("*", loggingMiddleware({ environment: "test", transport: capture }));
    app.get("/", (c) => {
      c.header("set-cookie", "session=super-secret-value; Path=/; HttpOnly");
      return c.text("body");
    });

    const res = await app.request("/", {
      headers: {
        "authorization": "Bearer super-secret-token",
        "cf-access-jwt-authorization": "eyJ-secret-jwt",
        "cookie": "sid=abc123; theme=dark"
      }
    });
    expect(res.status).toBe(200);

    const traces = capture.find("trace");
    const request = traces[0]!;
    const response = traces[1]!;

    const requestHeaders = request.context["headers"] as Record<string, string>;
    expect(requestHeaders["authorization"]).toBe("[redacted]");
    expect(requestHeaders["cf-access-jwt-authorization"]).toBe("[redacted]");
    expect(requestHeaders).not.toHaveProperty("cookie");
    expect(request.context["cookies"]).toStrictEqual(["sid", "theme"]);

    const responseHeaders = response.context["headers"] as Record<string, string>;
    expect(responseHeaders).not.toHaveProperty("set-cookie");
    expect(response.context["cookies"]).toStrictEqual(["session"]);

    // Sensitive values must never appear in the logged request context.
    expect(JSON.stringify(request.context)).not.toContain("super-secret-token");
    expect(JSON.stringify(request.context)).not.toContain("eyJ-secret-jwt");
  });

  it("truncates long response bodies in the response log", async () => {
    const capture = createCaptureTransport();
    const app = new Hono<LoggerEnv>();
    app.use("*", loggingMiddleware({ environment: "test", transport: capture }));
    app.get("/", (c) => c.text("z".repeat(100)));

    await app.request("/");

    const response = capture.find("trace")[1]!;
    expect(response.context["body"]).toBe("z".repeat(64) + "...");
  });
});
