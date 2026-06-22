---
name: cloudflare-logger
description: Authoritative usage patterns and anti-patterns for @adrianhall/cloudflare-logger. A small, synchronous, structured logging library for Cloudflare Workers, browsers, and Vitest tests. Use when adding logging to a Cloudflare Worker, a browser application, or a React app; when writing Vitest tests that need to assert on log output; or when deciding which transport to use for a given runtime and environment.
---

# cloudflare-logger

`@adrianhall/cloudflare-logger` is a small, synchronous, structured logging library
that runs across Vitest, browsers, and Cloudflare Workers. The core is
dependency-free. React lives behind the `/react` subpath only.

## When to use this package

- Adding structured logging to a **Cloudflare Worker** — use the structured transport
  for Workers Logs field indexing.
- Adding logging to a **browser or React application** — use the browser transport for
  DevTools-optimized output.
- **Vitest tests** that need to assert on emitted log records — use the capture
  transport.
- Any context where logging must **never throw** into application code.
- When you need **child loggers** to bind request-scoped or component-scoped context
  (e.g. `requestId`, `component`).

## Installation

```sh
npm install github:adrianhall/cloudflare-logger#1.0.1
```

React support requires React 19 as a peer dependency:

```sh
npm install github:adrianhall/cloudflare-logger#1.0.1 react@^19
```

The Hono middleware requires Hono 4 as a peer dependency:

```sh
npm install github:adrianhall/cloudflare-logger#1.0.1 hono@^4
```

The package commits `dist/` to release tags. Consumers do **not** need to run a build
step — install directly from the git tag.

## Import rules

```ts
// Core logger, types, all transports, config helper
import { createLogger, resolveLoggerConfig } from "@adrianhall/cloudflare-logger";

// React provider and hook — only import in browser React code
import { LoggingProvider, useLogger } from "@adrianhall/cloudflare-logger/react";

// Hono middleware — only import in Hono-based Workers
import { loggingMiddleware } from "@adrianhall/cloudflare-logger/hono";
```

- Never import from `@adrianhall/cloudflare-logger/react` in Worker code or core
  modules that run in Workers.
- Only import from `@adrianhall/cloudflare-logger/hono` in Hono-based Worker code. It
  requires the optional `hono` peer dependency.
- Use `.js` extensions in source imports for correct emitted ESM (the package itself
  does this internally).
- Use `import type` for type-only imports.

## Core logger usage

### `createLogger(options)`

```ts
import { createLogger, createCaptureTransport } from "@adrianhall/cloudflare-logger";

const logger = createLogger({
  level: "info", // minimum level to emit; defaults to "info"
  transport: createCaptureTransport(),
  bindings: { service: "my-api" }, // merged into every record
  clock: () => new Date("2026-01-01T00:00:00.000Z"), // override in tests
  onTransportError(error, record) {
    // called when transport.log() throws; exceptions here are swallowed
  }
});

logger.trace("fine detail"); // suppressed — below "info"
logger.debug("debug info"); // suppressed
logger.info("server started", { port: 8787 });
logger.warn("slow query", { duration: 1200 });
logger.error("request failed", { err }); // Error serialized automatically
logger.fatal("process dying");
```

### Level filtering

Records below the configured level are dropped **before** any context is accessed.
A getter that throws on a suppressed call is never evaluated:

```ts
const context = {
  get expensive() {
    throw new Error("should not run");
  }
};
logger.debug("suppressed", context); // getter never called when debug < configured level
```

### Child loggers

```ts
const requestLog = logger.child({ requestId: "req-abc", userId: "user-123" });
requestLog.info("handler started"); // context includes requestId + userId + service
```

Child loggers:

- Inherit `transport`, `level`, `clock`, and `onTransportError` from the parent.
- Merge their bindings on top of the parent's bindings (child wins on collision).
- Do not affect the parent logger.

### `isLevelEnabled`

```ts
if (logger.isLevelEnabled("debug")) {
  const expensiveData = computeExpensiveDebugInfo();
  logger.debug("dump", { expensiveData });
}
```

### Error serialization

Top-level `Error` values in context are automatically converted to plain objects:

```ts
logger.error("query failed", { err });
// Transport receives: { err: { name, message, stack?, cause? } }
```

Nested errors are not serialized automatically. Use `serializeError()` explicitly
for errors in nested positions.

## Transport selection

| Scenario                | Transport                      |
| ----------------------- | ------------------------------ |
| Vitest tests            | `createCaptureTransport()`     |
| Suppress all output     | `createSilentTransport()`      |
| Browser DevTools        | `createBrowserTransport()`     |
| `wrangler dev` terminal | `createConsoleTransport()`     |
| Cloudflare Workers Logs | `createStructuredTransport()`  |
| Multiple destinations   | `combineTransports(a, b, ...)` |

Use `resolveLoggerConfig(environment, runtime)` to select the right transport and
level automatically without hand-wiring:

```ts
const config = resolveLoggerConfig(process.env.NODE_ENV, "worker");
const logger = createLogger(config);
```

| Environment         | Runtime     | Level   | Transport  |
| ------------------- | ----------- | ------- | ---------- |
| `"test"`            | either      | `trace` | capture    |
| `"development"`     | `"browser"` | `info`  | browser    |
| `"development"`     | `"worker"`  | `debug` | console    |
| `"production"`      | `"browser"` | `warn`  | browser    |
| `"production"`      | `"worker"`  | `warn`  | structured |
| unknown/`undefined` | `"browser"` | `warn`  | browser    |
| unknown/`undefined` | `"worker"`  | `warn`  | structured |

## Testing with capture and silent transports

### Capture transport — preferred approach

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { createLogger, createCaptureTransport } from "@adrianhall/cloudflare-logger";

describe("my-service", () => {
  const capture = createCaptureTransport();
  const logger = createLogger({ level: "trace", transport: capture });

  beforeEach(() => capture.clear());

  it("emits a warning when threshold exceeded", () => {
    myService(logger);

    const warns = capture.find("warn"); // preferred: find by level
    expect(warns).toHaveLength(1);
    expect(warns[0].message).toBe("threshold exceeded");
    expect(warns[0].context.value).toBe(999);
  });
});
```

### `capture.find(level)` — preferred level-specific assertion helper

Always use `capture.find(level)` instead of filtering `capture.records` manually.
It is the documented and preferred way to assert on records at a specific level:

```ts
capture.find("error"); // all error records
capture.find("warn"); // all warn records
```

### `capture.records` — inspect all records

```ts
capture.records; // readonly LogRecord[] — all records in order
capture.records.length; // total count
capture.records[0].level; // "info" | "warn" | ...
capture.records[0].context.userId; // context value
```

Mutating `capture.records` does not affect internal storage (returns a shallow copy).

### Silent transport

Use when a logger is required by an interface but you want no output and no
assertions:

```ts
const logger = createLogger({ transport: createSilentTransport() });
```

## React usage

### Provider setup

Construct the logger **outside** the component tree — at module scope or in the
application entry point. Pass it to `<LoggingProvider>`:

```tsx
import { createLogger, resolveLoggerConfig } from "@adrianhall/cloudflare-logger";
import { LoggingProvider } from "@adrianhall/cloudflare-logger/react";

const logger = createLogger(resolveLoggerConfig("development", "browser"));

function App() {
  return (
    <LoggingProvider logger={logger}>
      <Router />
    </LoggingProvider>
  );
}
```

### `useLogger` hook

```tsx
import { useLogger } from "@adrianhall/cloudflare-logger/react";

// Without bindings — returns the provider's logger directly
function MyComponent() {
  const log = useLogger();
  // ...
}

// With bindings — returns a memoized child logger
const BINDINGS = { component: "MyComponent" } as const; // stable module-level constant

function MyComponent() {
  const log = useLogger(BINDINGS);

  useEffect(() => {
    log.info("mounted");
  }, [log]); // log is stable when BINDINGS is stable

  return null;
}
```

- `useLogger()` throws a descriptive error when called outside `<LoggingProvider>`.
- `useLogger(bindings)` memoizes on referential identity of the logger and bindings
  object. Pass stable references (module-level constants, `useMemo`, `useRef`) when
  child logger identity matters for `useEffect` deps or similar.
- Do **not** log during render — always log inside `useEffect`, event handlers, or
  callbacks.

### React testing with capture transport

```tsx
import { render } from "@testing-library/react";
import { createLogger, createCaptureTransport } from "@adrianhall/cloudflare-logger";
import { LoggingProvider } from "@adrianhall/cloudflare-logger/react";

const capture = createCaptureTransport();
const logger = createLogger({ level: "trace", transport: capture });

function renderWithLogger(ui: React.ReactElement) {
  return render(<LoggingProvider logger={logger}>{ui}</LoggingProvider>);
}
```

## Worker usage

### Production Worker

```ts
import { createLogger, createStructuredTransport } from "@adrianhall/cloudflare-logger";

// Construct once per isolate — outside fetch().
const logger = createLogger({
  level: "warn",
  transport: createStructuredTransport(), // object mode for Workers Logs
  bindings: { service: "my-worker" }
});

export default {
  fetch(request: Request, env: Env): Response {
    const log = logger.child({ url: request.url, cf: request.cf?.country });
    log.warn("rate limited", { ip: request.headers.get("cf-connecting-ip") });
    return new Response("ok");
  }
};
```

Structured payload shape received by Workers Logs:

```json
{
  "time": "2026-01-01T12:00:00.000Z",
  "level": "warn",
  "message": "rate limited",
  "service": "my-worker",
  "url": "https://example.com/api",
  "cf": "US",
  "ip": "1.2.3.4"
}
```

Enable Workers Observability in `wrangler.jsonc`:

```jsonc
{
  "observability": {
    "enabled": true,
    "head_sampling_rate": 1
  }
}
```

### `wrangler dev` terminal

```ts
import { createLogger, createConsoleTransport } from "@adrianhall/cloudflare-logger";

const logger = createLogger({
  level: "debug",
  transport: createConsoleTransport({ colors: true, timestamp: "time" })
});
```

Output: `12:30:45 INFO  server started {"port":8787}`

### Worker test with `@cloudflare/vitest-pool-workers`

```ts
import { describe, it, expect } from "vitest";
import { createLogger, createCaptureTransport } from "@adrianhall/cloudflare-logger";

describe("worker handler", () => {
  it("logs a warning", () => {
    const capture = createCaptureTransport();
    const logger = createLogger({ level: "trace", transport: capture });
    myHandler(logger, mockRequest);
    expect(capture.find("warn")).toHaveLength(1);
  });
});
```

## Hono usage

The `@adrianhall/cloudflare-logger/hono` subpath provides `loggingMiddleware`, which
attaches a request-scoped logger to the Hono context and logs each request and
response. `hono` is an optional peer dependency used only by this subpath; the core
entry point never imports it.

### Middleware setup

```ts
import { Hono } from "hono";
import { loggingMiddleware } from "@adrianhall/cloudflare-logger/hono";
import type { LoggerBindings, LoggerVariables } from "@adrianhall/cloudflare-logger/hono";

// Type the app so c.env.ENVIRONMENT and c.var.LOGGER are statically known.
const app = new Hono<{ Bindings: LoggerBindings; Variables: LoggerVariables }>();

app.use("*", loggingMiddleware("production")); // explicit environment
// app.use("*", loggingMiddleware());          // falls back to c.env.ENVIRONMENT

app.get("/", (c) => {
  c.var.LOGGER.info("handling request"); // request-scoped child logger
  return c.text("ok");
});

export default app;
```

Per request, the middleware:

- Resolves the environment from the argument, else `c.env.ENVIRONMENT`, and builds a
  Worker logger via `resolveLoggerConfig(environment, "worker")`.
- Sets a **correlation id** from the `CF-Ray` header, or `crypto.randomUUID()` when
  absent, bound via `logger.child({ correlationId })`.
- Logs the **request** at `trace`: `{ method, url, headers, cookies }`.
- Stores the child logger in `c.var.LOGGER` before `next()`.
- Logs the **response** at `trace`: `{ status, durationMs, headers, cookies, body }`
  where `body` is the first 64 bytes (with `...` appended when longer).

### Options object

```ts
loggingMiddleware({
  environment: "production", // overrides c.env.ENVIRONMENT
  level: "trace", // override the resolved level
  transport: createCaptureTransport() // override the resolved transport (tests)
});
```

### Level behavior in production

Request/response are logged at `trace`, but `resolveLoggerConfig("production", "worker")`
selects `warn`, so they are **suppressed in production** unless you pass `level: "trace"`.
This keeps verbose per-request logging a development/test concern by default.

### Sensitive data is stripped from header logs

- `Authorization` and `CF-Access-Jwt-Authorization` are reduced to `"[redacted]"` —
  only their presence is recorded, never the token.
- Cookies are logged as **names only** (array under `cookies`); the raw `cookie` /
  `set-cookie` headers are omitted. Cookie values are never logged.

### Testing the middleware

Inject a capture transport and force the level so trace records are captured:

```ts
import { Hono } from "hono";
import { createCaptureTransport } from "@adrianhall/cloudflare-logger";
import { loggingMiddleware } from "@adrianhall/cloudflare-logger/hono";

const capture = createCaptureTransport();
const app = new Hono();
app.use("*", loggingMiddleware({ environment: "test", transport: capture }));
app.get("/", (c) => c.text("ok"));

await app.request("/");
expect(capture.find("trace")).toHaveLength(2); // request + response
```

## Anti-patterns

### Do not import `/hono` outside Hono Workers

```ts
// BAD — pulls the optional hono peer into non-Hono code
import { loggingMiddleware } from "@adrianhall/cloudflare-logger/hono";

// GOOD — only Hono-based Workers import the /hono subpath
import { createLogger } from "@adrianhall/cloudflare-logger";
```

### Do not construct a logger inside a React component

```ts
// BAD — creates a new logger (and new capture transport) on every render
function MyComponent() {
  const logger = createLogger({ transport: createCaptureTransport() }); // wrong
}

// GOOD — construct once at module scope
const logger = createLogger(resolveLoggerConfig("development", "browser"));
function MyComponent() {
  const log = useLogger({ component: "MyComponent" });
}
```

### Do not log during React render

```tsx
// BAD — logs on every render
function MyComponent() {
  const log = useLogger();
  log.info("rendering"); // wrong — side effect during render
  return <div />;
}

// GOOD — log in effects and event handlers
function MyComponent() {
  const log = useLogger();
  useEffect(() => {
    log.info("mounted");
  }, [log]);
  return <div />;
}
```

### Do not import `/react` in Worker code

```ts
// BAD — pulls React into Worker bundle
import { useLogger } from "@adrianhall/cloudflare-logger/react";

// GOOD — Worker code only uses the core entry point
import { createLogger } from "@adrianhall/cloudflare-logger";
```

### Do not pass raw `Error` objects as nested context values

```ts
// BAD — nested error won't be serialized automatically
logger.error("failed", { wrapper: { err: new Error("oops") } });

// GOOD — top-level error values are serialized automatically
logger.error("failed", { err: new Error("oops") });

// ALSO GOOD — use serializeError() explicitly for nested positions
import { serializeError } from "@adrianhall/cloudflare-logger";
logger.error("failed", { wrapper: { err: serializeError(new Error("oops")) } });
```

### Do not use inline bindings when child logger identity matters

```ts
// BAD — new bindings object each render → new child logger each render
const log = useLogger({ component: "Widget" }); // runs child() every render

// GOOD — stable reference → child logger only recreated when logger changes
const BINDINGS = { component: "Widget" } as const;
const log = useLogger(BINDINGS);
```

### Do not add runtime dependency on this package in core Worker logic

This logger is dependency-free in its core. Do not add Pino, Winston, Chalk, or other
logging libraries as alternatives — the package is intentionally minimal and Worker-safe.

### Do not read environment variables inside the logger

`resolveLoggerConfig` does not read `process.env`. Applications are responsible for
reading their environment and passing the correct `environment` string. This is
intentional to keep the core Worker-safe and free of Node-only APIs.

### Do not use `detectRuntime()` — it is not exported in v1

Applications are expected to know whether they are constructing a browser logger or a
Worker logger. Pass `"browser"` or `"worker"` explicitly to `resolveLoggerConfig`.

## Follow-on work not yet implemented

The following features are explicitly deferred to post-v1:

- **Redaction** — no secret/PII redaction in v1. Planned as `withRedaction(transport, options)` or a `/redaction` subpath.
- **Request ID / correlation ID** — no built-in convention in the core; set via
  `logger.child({ requestId })`. The `/hono` middleware does provide a per-request
  correlation id (see "Hono usage").
- **Async transports** — all transports are synchronous in v1.
- **Flush API** — no flush mechanism in v1.
- **OpenTelemetry integration** — deferred.
- **Sentry integration** — deferred.
- **Tail Worker / Logpush integration** — deferred guidance.
- **Runtime detection** — `detectRuntime()` is omitted from the public API in v1.
- **Network transport** — no HTTP/fetch transport in v1.
