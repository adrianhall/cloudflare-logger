# @adrianhall/cloudflare-logger

A small, synchronous, structured logging library for applications that run across
tests, local development, browsers, and Cloudflare Workers.

## Install

```sh
npm install github:adrianhall/cloudflare-logger#1.0.1
```

React support requires React 19 or later as a peer dependency:

```sh
npm install github:adrianhall/cloudflare-logger#1.0.1 react@^19
```

The Hono middleware requires Hono 4 or later as a peer dependency:

```sh
npm install github:adrianhall/cloudflare-logger#1.0.1 hono@^4
```

## Quick start

```ts
import { createLogger, resolveLoggerConfig } from "@adrianhall/cloudflare-logger";

const logger = createLogger(resolveLoggerConfig("development", "worker"));

logger.info("server started", { port: 8787 });
logger.warn("slow query", { duration: 1200, table: "users" });
```

## Core concepts

- **Logger** — created with `createLogger(options)`, emits records at or above the configured level.
- **Transport** — receives records and writes them to a destination (console, memory, etc.).
- **Bindings** — key-value pairs merged into every record's context; set at construction time.
- **Child logger** — inherits transport, level, and bindings; adds its own bindings on top.

## Worker production example

```ts
import { createLogger, createStructuredTransport } from "@adrianhall/cloudflare-logger";

// Construct once per Worker isolate, outside fetch().
const logger = createLogger({
  level: "warn",
  transport: createStructuredTransport() // object mode for Workers Logs field indexing
});

export default {
  fetch(request: Request): Response {
    const log = logger.child({ url: request.url, method: request.method });
    log.info("request received"); // suppressed — below "warn"
    log.warn("rate limited"); // emitted
    return new Response("ok");
  }
};
```

Enable Workers Observability in `wrangler.jsonc` to persist structured logs:

```jsonc
{
  "observability": {
    "enabled": true,
    "head_sampling_rate": 1
  }
}
```

## Browser development example

```ts
import { createLogger, createBrowserTransport } from "@adrianhall/cloudflare-logger";

const logger = createLogger({
  level: "info",
  transport: createBrowserTransport(),
  bindings: { app: "my-app" }
});

logger.info("app initialized");
logger.debug("config loaded", { theme: "dark" }); // suppressed — below "info"
```

## React provider example

```tsx
import { useEffect } from "react";
import { createLogger, resolveLoggerConfig } from "@adrianhall/cloudflare-logger";
import { LoggingProvider, useLogger } from "@adrianhall/cloudflare-logger/react";

// Construct once at module scope — outside the component tree.
const logger = createLogger(resolveLoggerConfig("development", "browser"));

function App() {
  return (
    <LoggingProvider logger={logger}>
      <Widget />
    </LoggingProvider>
  );
}

// Module-level stable bindings so child logger identity is preserved across renders.
const WIDGET_BINDINGS = { component: "Widget" } as const;

function Widget() {
  const log = useLogger(WIDGET_BINDINGS);

  useEffect(() => {
    log.info("mounted");
  }, [log]);

  return null;
}
```

## Hono middleware example

The `@adrianhall/cloudflare-logger/hono` subpath provides `loggingMiddleware`, which
attaches a request-scoped logger to the Hono context and logs each request and
response. `hono` is an optional peer dependency, used only by this subpath — the core
entry point never imports it.

```ts
import { Hono } from "hono";
import { loggingMiddleware } from "@adrianhall/cloudflare-logger/hono";
import type { LoggerBindings, LoggerVariables } from "@adrianhall/cloudflare-logger/hono";

// Type your app so c.env.ENVIRONMENT and c.var.LOGGER are statically known.
const app = new Hono<{ Bindings: LoggerBindings; Variables: LoggerVariables }>();

// Pass an environment explicitly...
app.use("*", loggingMiddleware("production"));
// ...or omit it and the middleware reads c.env.ENVIRONMENT at request time.
// app.use("*", loggingMiddleware());

app.get("/", (c) => {
  // The request-scoped child logger (bound with the correlation id) is on the context.
  c.var.LOGGER.info("handling request");
  return c.text("ok");
});

export default app;
```

For each request the middleware:

- Resolves the environment from the argument, falling back to `c.env.ENVIRONMENT`, and
  builds a Worker logger via [`resolveLoggerConfig`](#resolveloggerconfig--default-config-policy).
- Derives a **correlation id** from the `CF-Ray` header, or generates a UUID
  (`crypto.randomUUID()`) when the header is absent, and binds it to the logger via
  `logger.child({ correlationId })`.
- Logs the **request** at `trace`: `{ method, url, headers, cookies }`.
- Stores the child logger in `c.var.LOGGER` before calling `next()`.
- Logs the **response** at `trace`: `{ status, durationMs, headers, cookies, body }`,
  where `body` is the first 64 bytes of the payload (with `...` appended when longer).

### Options

`loggingMiddleware` also accepts an options object instead of an environment string:

```ts
loggingMiddleware({
  environment: "production", // overrides c.env.ENVIRONMENT
  level: "trace", // override the resolved level (see note below)
  transport: createCaptureTransport() // override the resolved transport (handy in tests)
});
```

> **Level note:** the request and response are logged at `trace`. Because
> `resolveLoggerConfig("production", "worker")` selects `warn`, request/response logs
> are **suppressed in production** unless you pass `level: "trace"`. This keeps verbose
> per-request logging a development/test concern by default.

### Sensitive data handling

Header logging is designed to avoid leaking secrets (see the security warning below):

- The `Authorization` and `CF-Access-Jwt-Authorization` headers are reduced to
  `"[redacted]"` — only their presence is recorded, never the bearer token.
- Cookies are **never** logged with their values. The request `Cookie` header and the
  response `Set-Cookie` headers are recorded as an array of cookie **names** only (under
  `cookies`), and the raw `cookie`/`set-cookie` headers are omitted from `headers`.

## Vitest capture example

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { createLogger, createCaptureTransport } from "@adrianhall/cloudflare-logger";

describe("my feature", () => {
  const capture = createCaptureTransport();
  const logger = createLogger({ level: "trace", transport: capture });

  beforeEach(() => capture.clear());

  it("logs a warning when threshold exceeded", () => {
    myFeature(logger, { value: 999 });

    const warns = capture.find("warn");
    expect(warns).toHaveLength(1);
    expect(warns[0].message).toBe("threshold exceeded");
    expect(warns[0].context.value).toBe(999);
  });
});
```

## `resolveLoggerConfig` — default config policy

`resolveLoggerConfig(environment, runtime)` selects a level and transport from the
policy table below. Each call returns a fresh transport instance.

| Environment           | Runtime     | Level   | Transport  |
| --------------------- | ----------- | ------- | ---------- |
| `"test"`              | `"browser"` | `trace` | capture    |
| `"test"`              | `"worker"`  | `trace` | capture    |
| `"development"`       | `"browser"` | `info`  | browser    |
| `"development"`       | `"worker"`  | `debug` | console    |
| `"production"`        | `"browser"` | `warn`  | browser    |
| `"production"`        | `"worker"`  | `warn`  | structured |
| unknown / `undefined` | `"browser"` | `warn`  | browser    |
| unknown / `undefined` | `"worker"`  | `warn`  | structured |

```ts
import { createLogger, resolveLoggerConfig } from "@adrianhall/cloudflare-logger";

// Vitest: auto-capture at trace level
const logger = createLogger(resolveLoggerConfig("test", "browser"));

// Cloudflare Worker production: structured JSON at warn level
const workerLogger = createLogger(resolveLoggerConfig("production", "worker"));
```

## Transports

| Transport  | Factory                               | Purpose                                            |
| ---------- | ------------------------------------- | -------------------------------------------------- |
| Capture    | `createCaptureTransport()`            | Stores records in memory for Vitest assertions.    |
| Silent     | `createSilentTransport()`             | Discards all records. No output, no throw.         |
| Browser    | `createBrowserTransport(options?)`    | DevTools-optimized with `%c` level badges.         |
| Console    | `createConsoleTransport(options?)`    | Human-readable terminal output for `wrangler dev`. |
| Structured | `createStructuredTransport(options?)` | JSON object or string payloads for Workers Logs.   |
| Combine    | `combineTransports(...transports)`    | Fans out to multiple transports.                   |

### Capture transport

```ts
const capture = createCaptureTransport();
capture.records; // readonly LogRecord[] — all records in order
capture.find("error"); // readonly LogRecord[] — records at a specific level
capture.clear(); // remove all stored records
```

### Browser transport

```ts
createBrowserTransport({
  levelStyles: {
    warn: "color: orange; font-weight: bold" // override one level's badge style
  }
});
```

Level-to-method mapping: `trace`/`debug` → `console.debug`, `info` → `console.info`,
`warn` → `console.warn`, `error`/`fatal` → `console.error`. Missing methods fall back
to `console.log`.

### Console transport

```ts
createConsoleTransport({
  colors: true, // ANSI color codes (default: true)
  timestamp: "time" // "time" | "iso" | false (default: "time")
});
```

Output example:

```text
12:30:45 INFO  server started {"port":8787}
```

Level-to-method mapping: `trace`/`debug`/`info` → `console.log`,
`warn`/`error`/`fatal` → `console.error`.

### Structured transport

```ts
createStructuredTransport({
  stringify: false // false = object (default, recommended for Workers Logs)
  // true  = JSON string
});
```

Payload shape: `{ time, level, message, ...context }`. Reserved keys (`time`, `level`,
`message`) take precedence over context keys with the same name.

### Combine transport

```ts
const transport = combineTransports(createCaptureTransport(), createStructuredTransport());
```

Attempts every child transport in order. If one child throws, the error is re-thrown
after all children have been attempted. If multiple children throw, an `AggregateError`
is thrown. The logger-level `try`/`catch` catches the combined failure and routes it
through `onTransportError` without crashing application code.

## Transport failure behavior

Built-in transports are designed to be non-throwing. For custom transports, the logger
wraps every `transport.log()` call in `try`/`catch`:

```ts
const logger = createLogger({
  transport: myTransport,
  onTransportError(error, record) {
    // Called when transport.log() throws.
    // Any exception thrown here is also swallowed.
    console.error("transport error", error, record);
  }
});
```

- If `onTransportError` is not provided, transport errors are silently dropped.
- Disabled log calls (below the configured level) never reach the transport.
- Transport errors never propagate into application code.

## Child loggers

Child loggers inherit the parent's transport, level, clock, and error handler. They
merge additional bindings on top of the parent's bindings. The parent is not affected.

```ts
const requestLog = logger.child({ requestId: "req-abc", userId: "user-123" });
requestLog.info("handler started"); // includes requestId + userId in context
requestLog.error("handler failed", { err }); // err is serialized automatically
```

## Error serialization

Top-level `Error` values in context are automatically serialized to plain objects
before transport delivery:

```ts
try {
  await db.query(sql);
} catch (err) {
  logger.error("query failed", { err }); // err serialized: { name, message, stack?, cause? }
}
```

Nested errors (inside arrays, nested objects) are not serialized automatically.

## React — `useLogger` stability

`useLogger(bindings)` memoizes the child logger based on referential identity of the
provider's logger and the `bindings` object. Pass stable references when child logger
identity matters to avoid re-creating the child on every render:

```ts
// Good — stable module-level constant
const BINDINGS = { component: "Header" } as const;
const log = useLogger(BINDINGS);

// Acceptable — identity instability only matters if log is a dependency
const log = useLogger({ component: "Header" }); // new object each render
```

## Security and privacy warning

**v1 does not redact secrets or personally identifiable information.**

Do not log secrets, tokens, passwords, cookies, API keys, private keys, or sensitive
PII. Treat all structured context as production log data. Cloudflare Workers Logs can
index and make structured fields searchable — sensitive fields become queryable if
logged.

Use application-level controls to filter sensitive data before passing it to logger
context. Redaction support is planned for a future release.

## Cloudflare Workers Observability

The structured transport is designed to work with Cloudflare Workers Logs. Workers Logs
automatically extracts and indexes fields from JSON object logs when Observability is
enabled in `wrangler.jsonc`:

```jsonc
{
  "observability": {
    "enabled": true,
    "head_sampling_rate": 1
  }
}
```

Use `createStructuredTransport({ stringify: false })` (the default) for maximum
compatibility with Workers Logs field indexing. Use `stringify: true` only when a
downstream sink specifically requires a string.

## Troubleshooting

**`dist/` is missing after `npm install`**:

This package commits `dist/` to git tags so consumers do not need to run a build step.
If `dist/` is missing, you may have installed from a branch rather than a release tag.
Use a tag reference:

```sh
npm install github:adrianhall/cloudflare-logger#1.0.1
```

**TypeScript cannot find types**:

Ensure your `tsconfig.json` includes `"moduleResolution": "NodeNext"` or
`"moduleResolution": "Bundler"`. The package exports `.d.ts` files alongside each
`.js` file in `dist/`.

**`useLogger` throws "must be called inside a `<LoggingProvider>`"**:

Wrap your component tree with `<LoggingProvider logger={logger}>` before calling
`useLogger()`. The logger must be constructed outside the component tree.

**Stale `dist/` after editing source**:

Run `npm run release` to rebuild and re-stage `dist/`, then commit the result.
`npm run check:dist` will fail until `dist/` matches source.

## Development

```sh
npm install
npm run check          # format, lint, types, dist freshness, pack
npm run test:coverage  # all Vitest projects with 100% coverage requirement
```

## Contributing

Thank you for your interest in this project. We are currently not taking external contributions.

## License

[MIT](./LICENSE)
