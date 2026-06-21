# `@adrianhall/cloudflare-logger` Engineering Specification

> Status: Draft v1 for implementation planning.
> Source draft: `docs/LOGGER_SPEC.md`.
> Target repository: `adrianhall/cloudflare-logger`.
> Target package: `@adrianhall/cloudflare-logger`.

## 1. Purpose

`@adrianhall/cloudflare-logger` is a small, synchronous, structured logging library for
applications that run across test, local development, browsers, and Cloudflare Workers.

The library provides the reusable logging engine and default transports. Applications are
responsible for deciding which logger configuration to use for their own environment,
runtime, framework, and request lifecycle.

The primary use cases are:

| Use case                      | Expected behavior                                                                                  |
| ----------------------------- | -------------------------------------------------------------------------------------------------- |
| Vitest unit/integration tests | Capture records deterministically without console noise.                                           |
| Local browser development     | Emit inspectable records to browser DevTools with useful severity mapping.                         |
| Local Worker development      | Emit readable, colorized terminal logs for `wrangler dev`.                                         |
| Production Workers            | Emit structured JSON-compatible records to Cloudflare Workers Logs.                                |
| Production browser code       | Emit structured records or warnings/errors using console methods without pulling Worker-only code. |
| React applications            | Provide a configured logger through React context without coupling logger construction to React.   |

## 2. Goals

- Provide a minimal, stable logging API with `trace`, `debug`, `info`, `warn`, `error`, and `fatal` methods.
- Support structured context on every log call.
- Support child loggers for bound context such as component names, feature names, or request metadata.
- Keep the core package free of runtime dependencies.
- Keep React isolated behind the `/react` subpath.
- Run in browser, Cloudflare Workers, and Node-based tests.
- Make logger behavior fully testable with Vitest.
- Make transport failures non-fatal to application code.
- Ship a git-tag-consumable package without requiring consumers to run a `prepare` build.
- Keep production Worker output friendly to Cloudflare Workers Logs structured indexing.

## 3. Non-Goals

- No redaction in v1.
- No async transports in v1.
- No flushing API in v1.
- No network transport in v1.
- No OpenTelemetry, Sentry, Logpush, or Tail Worker integration in v1.
- No Hono middleware in v1.
- No request ID or correlation ID convention in v1.
- No runtime dependency on Pino, LogTape, Winston, Chalk, or other logging libraries.
- No implicit global singleton logger.
- No environment variable reads inside the core logger.
- No framework-specific configuration in the core entry point.

## 4. Design Principles

- Explicit construction is preferred over global configuration.
- The logger owns level filtering.
- Transports own destination formatting.
- Logging must not crash application code.
- Built-in transports must be best-effort and non-throwing.
- Test capture must be instance-based, not global.
- Core imports must be safe for Workers.
- React must never be imported by the core entry point.
- Public surface area should remain small until multiple consumers prove more helpers are needed.
- Behavior that cannot be tested deterministically should either be avoided or hidden behind a narrow interface.

## 5. Runtime Support

| Runtime            | Support level                               | Notes                                                                        |
| ------------------ | ------------------------------------------- | ---------------------------------------------------------------------------- |
| Cloudflare Workers | Required                                    | Validate with `@cloudflare/vitest-pool-workers`. Do not rely on Node APIs.   |
| Browser            | Required                                    | Validate browser transport and React integration with jsdom.                 |
| Node               | Required for tests and package verification | Validate pure logic and package exports with Vitest and direct import tests. |

The implementation must avoid Node-only APIs in `src/**` unless the file is test-only or tooling-only.

The Worker test project should run without `nodejs_compat` unless a specific, documented dependency requires it. The logger is intended to prove Worker portability without Node compatibility shims.

## 6. Public Package Surface

The package has two public entry points.

| Import                                | Purpose                                                | Runtime                      |
| ------------------------------------- | ------------------------------------------------------ | ---------------------------- |
| `@adrianhall/cloudflare-logger`       | Core logger, types, transports, default config helper. | Browser, Worker, Node tests. |
| `@adrianhall/cloudflare-logger/react` | React provider and hook.                               | Browser React applications.  |

The core entry point must not import React. The `/react` entry point may import React and may depend on React peer dependencies.

### 6.1 Recommended Core Exports

```ts
export { createLogger } from "./logger.js";
export { serializeError } from "./serialize.js";
export { resolveLoggerConfig } from "./resolve.js";
export { createBrowserTransport } from "./transports/browser.js";
export { createCaptureTransport } from "./transports/capture.js";
export { combineTransports } from "./transports/combine.js";
export { createConsoleTransport } from "./transports/console.js";
export { createSilentTransport } from "./transports/silent.js";
export { createStructuredTransport } from "./transports/structured.js";
export type {
  CaptureTransport,
  CreateLoggerOptions,
  Environment,
  Logger,
  LogContext,
  LogLevel,
  LogRecord,
  ResolvedLoggerConfig,
  Runtime,
  Transport,
  TransportErrorHandler
} from "./types.js";
```

Decision: use `.js` extensions in source imports for emitted ESM correctness. This intentionally differs from the earlier draft's barrel convention if needed. A package that emits plain ESM with `tsc` should be directly importable by Node and bundlers after build.

### 6.2 Recommended React Exports

```ts
export { LoggingProvider } from "./LoggingProvider.js";
export { useLogger } from "./useLogger.js";
export type { LoggingProviderProps } from "./LoggingProvider.js";
```

### 6.3 Surface Area Rules

- Do not export internal helpers for safe stringification, console method selection, ANSI formatting, or stable object comparison.
- Do not export internal level weight helpers unless a consumer proves a need.
- Do not export transport classes.
- Prefer factory functions over classes.
- Do not export a global logger singleton.
- Do not add convenience APIs until there is a concrete use case in a consuming app.

## 7. Package And Distribution

The package is distributed as a git-tag dependency initially.

Recommended distribution model:

- Commit `dist/` to release tags.
- Do not rely on a `prepare` script for consumer installs.
- Do not use Husky as the source of truth for building `dist/`.
- Use CI and release checks to prove `dist/` is current.
- Keep `prepack` available for local package validation, but do not make consumers run build scripts during install.

Rationale:

- Git dependencies that rely on `prepare` require consumer-side install scripts.
- Consumer install scripts are frequently disabled or require allowlisting.
- Husky hooks are bypassable and do not run in CI by default.
- A committed `dist/` gives git-tag consumers deterministic install behavior.
- CI can enforce that committed `dist/` matches source.

### 7.1 `package.json` Shape

```jsonc
{
  "name": "@adrianhall/cloudflare-logger",
  "version": "1.0.0",
  "type": "module",
  "license": "MIT",
  "sideEffects": false,
  "engines": {
    "node": ">= 24",
    "npm": ">= 11"
  },
  "files": ["dist", "skills", "README.md", "LICENSE"],
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./react": {
      "types": "./dist/react/index.d.ts",
      "import": "./dist/react/index.js"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "check": "run-s check:*",
    "check:dist": "npm run build && test -z \"$(git status --porcelain -- dist)\"",
    "check:format": "prettier --check .",
    "check:lint": "eslint .",
    "check:pack": "npm pack --dry-run --ignore-scripts",
    "check:types": "tsc -b",
    "fix": "run-s fix:*",
    "fix:format": "prettier --write .",
    "fix:lint": "eslint --fix .",
    "prepack": "npm run build",
    "release": "npm run build && git add dist",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage"
  },
  "peerDependencies": {
    "react": ">= 19"
  },
  "peerDependenciesMeta": {
    "react": {
      "optional": true
    }
  }
}
```

`react-dom` should not be a peer dependency unless the implementation imports it or the tests require it as a public peer. React context and hooks only require `react`.

### 7.2 Build Output

The build emits ESM JavaScript and declaration files into `dist/`.

Required outputs:

```text
dist/
  index.js
  index.d.ts
  levels.js
  levels.d.ts
  logger.js
  logger.d.ts
  resolve.js
  resolve.d.ts
  serialize.js
  serialize.d.ts
  types.js
  types.d.ts
  transports/
    browser.js
    browser.d.ts
    capture.js
    capture.d.ts
    combine.js
    combine.d.ts
    console.js
    console.d.ts
    silent.js
    silent.d.ts
    structured.js
    structured.d.ts
  react/
    index.js
    index.d.ts
    LoggingProvider.js
    LoggingProvider.d.ts
    useLogger.js
    useLogger.d.ts
```

The package should be validated by direct-import tests against `dist/` before tagging.

## 8. Core Types

```ts
export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export type LogContext = Record<string, unknown>;

export interface LogRecord {
  readonly time: string;
  readonly level: LogLevel;
  readonly levelValue: number;
  readonly message: string;
  readonly context: LogContext;
}

export interface Transport {
  log(record: LogRecord): void;
}

export type TransportErrorHandler = (error: unknown, record: LogRecord) => void;

export interface CreateLoggerOptions {
  readonly level?: LogLevel;
  readonly transport: Transport;
  readonly bindings?: LogContext;
  readonly clock?: () => Date;
  readonly onTransportError?: TransportErrorHandler;
}

export interface Logger {
  trace(message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  fatal(message: string, context?: LogContext): void;
  child(bindings: LogContext): Logger;
  readonly level: LogLevel;
  isLevelEnabled(level: LogLevel): boolean;
}
```

Decision: use `level: LogLevel` plus `levelValue: number` rather than `level: number` plus `levelName`. This keeps the common field ergonomic while preserving numeric severity for transports and tests.

## 9. Levels

```ts
const LOG_LEVELS: Readonly<Record<LogLevel, number>> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60
};

function levelValue(level: LogLevel): number;
```

Semantics:

- A record is emitted when `LOG_LEVELS[record.level] >= LOG_LEVELS[logger.level]`.
- `LOG_LEVELS` and `levelValue()` are internal implementation details in v1.
- Numeric values are stable for emitted `LogRecord.levelValue` once v1 is released.
- Internal `levelValue()` throws a `TypeError` for invalid runtime input.
- TypeScript consumers should normally rely on the `LogLevel` type rather than runtime validation.

## 10. Logger Semantics

```ts
export function createLogger(options: CreateLoggerOptions): Logger;
```

Required behavior:

- `options.transport` is required.
- Default level is `info`.
- Default clock is `() => new Date()`.
- Each level method checks `isLevelEnabled()` before creating a record.
- Disabled calls must not touch the supplied context object.
- Enabled calls create exactly one `LogRecord`.
- `record.time` is `clock().toISOString()`.
- `record.level` is the method level.
- `record.levelValue` is the numeric level weight.
- `record.message` is the supplied message.
- `record.context` is a new object containing merged bindings and per-call context.
- Merge order is `{ ...bindings, ...callContext }`.
- Per-call context wins on key collision.
- Input `bindings` and `context` objects are never mutated.
- Top-level `Error` values in the merged context are serialized before transport delivery.
- Transports must not receive raw top-level `Error` values from logger-created records.
- Child loggers share the same transport, level, clock, and transport error handler.
- Child bindings are `{ ...parentBindings, ...childBindings }`.
- Parent loggers are not affected by child bindings.

Disabled call example:

```ts
const context = {
  get expensive() {
    throw new Error("should not run");
  }
};

logger.debug("suppressed", context);
```

If `debug` is disabled, the getter must not be evaluated.

## 11. Transport Failure Semantics

Decision: logging failures must never escape logger level methods.

This is the proposed v1 contract:

- Built-in transports must not throw during normal operation.
- Custom transports should not throw, but the logger must defensively handle throws.
- `createLogger` must wrap `transport.log(record)` in `try`/`catch`.
- If `transport.log(record)` throws, the logger must invoke `onTransportError(error, record)` when provided.
- If `onTransportError` throws, the logger must swallow that error too.
- If no `onTransportError` is provided, the logger silently drops the transport error.
- Transport failure handling must not recurse through the same logger.
- Disabled log calls must not call the transport or the error handler.
- This behavior applies equally to root and child loggers.

Rationale:

- A logger should not crash a production request because formatting or console output failed.
- A broken custom transport should be diagnosable in tests and development.
- An optional callback provides diagnostics without adding a second logger, global state, or async error channel.
- Swallowing errors from the diagnostic callback prevents logging from becoming a new failure path.

Implementation sketch:

```ts
try {
  transport.log(record);
} catch (error) {
  try {
    onTransportError?.(error, record);
  } catch {
    // Logging must not throw into application code.
  }
}
```

### 11.1 Built-In Transport Safety

Built-in transports must guard their own formatting logic.

Required safeguards:

- JSON formatting must handle circular references.
- JSON formatting must handle `bigint` values.
- JSON formatting must handle symbols and functions.
- Context property access during formatting should be best-effort.
- Console method selection must fall back when a specific method is missing.
- If formatting fails unexpectedly, the transport should emit a minimal fallback record rather than throw.

The fallback record should preserve time, level, and message where possible.

### 11.2 `combineTransports` Failure Behavior

`combineTransports(...transports)` must isolate each child transport.

Required behavior:

- Invoke child transports in declaration order.
- Attempt every child transport even if an earlier child throws.
- If no child throws, return normally.
- If one child throws, throw that error after all children have been attempted.
- If multiple children throw, throw an `AggregateError` after all children have been attempted.

The logger-level `try`/`catch` then reports the combined failure through `onTransportError` without crashing application code.

## 12. Error Serialization

```ts
export function serializeError(value: unknown): unknown;
```

Required behavior:

- Non-`Error` values are returned unchanged.
- `Error` values become plain objects.
- Serialized errors include `name` and `message`.
- Serialized errors include `stack` when present.
- Serialized errors include `cause` when present.
- `cause` is serialized shallowly if it is an `Error`.
- The logger only applies `serializeError()` to top-level context values.

Example:

```ts
logger.error("save failed", { err });
```

Resulting context shape:

```ts
{
  err: {
    name: 'Error',
    message: 'database unavailable',
    stack: '...'
  }
}
```

## 13. Safe Formatting

The implementation needs an internal formatter for transports that render context as JSON or strings.

This helper should not be exported in v1.

Required behavior:

- Produce compact JSON for plain JSON-compatible values.
- Convert `bigint` to string with an `n` suffix or a clearly documented string representation.
- Convert functions to a stable placeholder such as `[Function name]`.
- Convert symbols to `Symbol(description)`.
- Replace circular references with `[Circular]`.
- Avoid throwing for common non-JSON values.
- Fall back to a stable placeholder if formatting fails.

This helper is used by `createConsoleTransport()` and by `createStructuredTransport({ stringify: true })`.

`createStructuredTransport({ stringify: false })` should pass an object to `console` and should avoid unnecessary deep cloning. It may still need shallow reserved-key handling.

## 14. Transports

Level filtering is performed by the logger. Transports receive only records that should be emitted.

### 14.1 Capture Transport

```ts
export interface CaptureTransport extends Transport {
  readonly records: readonly LogRecord[];
  clear(): void;
  find(level: LogLevel): readonly LogRecord[];
}

export function createCaptureTransport(): CaptureTransport;
```

Required behavior:

- Store records in order.
- Emit nothing to console.
- `.records` returns an immutable snapshot or read-only view.
- Mutating the returned `.records` value must not mutate internal state.
- `clear()` removes all stored records.
- `find(level)` returns records whose `record.level` matches `level`.
- `find(level)` is included specifically for test ergonomics and should be documented as the preferred way to assert on records at a specific level.

### 14.2 Silent Transport

```ts
export function createSilentTransport(): Transport;
```

Required behavior:

- Do nothing.
- Never emit to console.
- Never throw.

### 14.3 Browser Transport

```ts
export interface BrowserTransportOptions {
  readonly levelStyles?: Partial<Record<LogLevel, string>>;
}

export function createBrowserTransport(options?: BrowserTransportOptions): Transport;
```

Required behavior:

- `trace` and `debug` use `console.debug`.
- `info` uses `console.info`.
- `warn` uses `console.warn`.
- `error` and `fatal` use `console.error`.
- The call shape is optimized for browser DevTools.
- The context object is passed as a separate console argument when non-empty.
- Empty context is omitted.
- A level badge may use `%c` styling.
- Missing console methods fall back to `console.log`.

Example output call shape:

```ts
console.info("%cINFO", "...", "user loaded", { userId: "123" });
```

### 14.4 Console Transport

```ts
export interface ConsoleTransportOptions {
  readonly colors?: boolean;
  readonly timestamp?: "time" | "iso" | false;
}

export function createConsoleTransport(options?: ConsoleTransportOptions): Transport;
```

Required behavior:

- Intended for local terminal output, including `wrangler dev`.
- Emit one line per record.
- Default `colors` is `true`.
- Default `timestamp` is `'time'`.
- `trace`, `debug`, and `info` use `console.log`.
- `warn`, `error`, and `fatal` use `console.error`.
- Context is appended as compact safe JSON when non-empty.
- `colors: false` disables ANSI color codes.
- `timestamp: false` omits the timestamp.
- `timestamp: 'time'` emits a concise time derived from `record.time`.
- `timestamp: 'iso'` emits the full ISO timestamp.

Example:

```text
12:30:45 INFO  server started {"port":8787}
```

### 14.5 Structured Transport

```ts
export interface StructuredTransportOptions {
  readonly stringify?: boolean;
}

export function createStructuredTransport(options?: StructuredTransportOptions): Transport;
```

Required behavior:

- Intended for Cloudflare Workers Logs and other structured-console environments.
- `trace` and `debug` use `console.debug`.
- `info` uses `console.log`.
- `warn` uses `console.warn`.
- `error` and `fatal` use `console.error`.
- Default `stringify` is `false`.
- With `stringify: false`, pass one object as the only console argument.
- With `stringify: true`, pass one safe JSON string as the only console argument.
- Payload shape is `{ time, level, message, ...context }`.
- Reserved keys `time`, `level`, and `message` from the record take precedence over context keys.

Cloudflare Workers Logs automatically extracts and indexes fields from JSON object logs. The structured transport should therefore prefer object logging in Workers unless a downstream sink specifically requires strings.

The default production browser policy intentionally uses the browser transport, not the structured transport. Production browser logs should follow DevTools conventions while using a higher minimum level.

### 14.6 Combine Transport

```ts
export function combineTransports(...transports: readonly Transport[]): Transport;
```

Required behavior:

- Forward each record to each transport in order.
- Attempt all transports even when one fails.
- Throw after attempting all transports if any child transport failed.
- Let `createLogger` catch and report the combined failure.

## 15. Default Config Helper

```ts
export type Environment = "test" | "development" | "production" | (string & {});
export type Runtime = "browser" | "worker";

export interface ResolvedLoggerConfig {
  readonly level: LogLevel;
  readonly transport: Transport;
}

export function resolveLoggerConfig(
  environment: Environment | undefined,
  runtime: Runtime
): ResolvedLoggerConfig;
```

Required behavior:

- This helper is optional policy, not required by `createLogger`.
- It creates a fresh transport on every call.
- Unknown or undefined environment maps to production behavior.
- `test` maps to capture transport and `trace` level.
- `development` in browser maps to browser transport and `info` level.
- `development` in worker maps to console transport and `debug` level.
- `production` in browser maps to browser transport and `warn` level.
- `production` in worker maps to structured transport and `warn` level.

Policy table:

| Environment   | Runtime   | Level   | Transport  |
| ------------- | --------- | ------- | ---------- |
| `test`        | `browser` | `trace` | capture    |
| `test`        | `worker`  | `trace` | capture    |
| `development` | `browser` | `info`  | browser    |
| `development` | `worker`  | `debug` | console    |
| `production`  | `browser` | `warn`  | browser    |
| `production`  | `worker`  | `warn`  | structured |
| unknown       | `browser` | `warn`  | browser    |
| unknown       | `worker`  | `warn`  | structured |

`detectRuntime()` is not exported in v1. Runtime detection is easy to get subtly wrong, especially because Node, Workers, service workers, and browser-like test environments overlap. Applications are expected to know whether they are constructing a browser logger or a Worker logger.

## 16. React Subpath

The React subpath provides context wiring only. It does not construct loggers and does not read environment.

```ts
import type { Logger, LogContext } from "@adrianhall/cloudflare-logger";

export interface LoggingProviderProps {
  readonly logger: Logger;
  readonly children: React.ReactNode;
}

export function LoggingProvider(props: LoggingProviderProps): React.JSX.Element;

export function useLogger(bindings?: LogContext): Logger;
```

Required behavior:

- `LoggingProvider` stores the provided logger in React context.
- `useLogger()` returns the context logger.
- `useLogger()` throws a clear error when used outside a provider.
- `useLogger(bindings)` returns a child logger with the supplied bindings.
- The hook must not log during render.
- Documentation examples must not log during render.

Recommendation for `useLogger(bindings)` memoization:

- Use React memoization based on `logger` and the `bindings` object identity.
- Do not use stable JSON serialization for arbitrary `unknown` values.
- Document that callers should pass stable bindings when they care about child logger identity.
- Inline bindings are acceptable when identity stability does not matter.

Example:

```tsx
import { useEffect } from "react";
import { createLogger, resolveLoggerConfig } from "@adrianhall/cloudflare-logger";
import { LoggingProvider, useLogger } from "@adrianhall/cloudflare-logger/react";

const logger = createLogger(resolveLoggerConfig("development", "browser"));

function Root() {
  return (
    <LoggingProvider logger={logger}>
      <Widget />
    </LoggingProvider>
  );
}

function Widget() {
  const log = useLogger({ component: "Widget" });

  useEffect(() => {
    log.info("mounted");
  }, [log]);

  return null;
}
```

## 17. File Layout

```text
src/
  index.ts
  levels.ts
  logger.ts
  resolve.ts
  serialize.ts
  types.ts
  internal/
    console.ts
    safe-json.ts
  transports/
    browser.ts
    capture.ts
    combine.ts
    console.ts
    silent.ts
    structured.ts
  react/
    index.ts
    LoggingProvider.tsx
    context.ts
    useLogger.ts
test/
  node/
    levels.test.ts
    logger.test.ts
    resolve.test.ts
    serialize.test.ts
    transports.capture.test.ts
    transports.combine.test.ts
    transports.console.test.ts
    transports.silent.test.ts
    transports.structured.test.ts
  browser/
    transports.browser.test.ts
    react.test.tsx
    resolve.browser.test.ts
  workers/
    worker-compat.test.ts
  package/
    dist-import.test.ts
README.md
CHANGELOG.md
skills/
  cloudflare-logger/
    SKILL.md
docs/
  ENG_SPEC.md
```

`SKILL.md` lives at `skills/cloudflare-logger/SKILL.md` so it can be consumed with
`npx skills add`. The `skills` directory is included in the published `files` list.

Implementation files should start with a concise `@file` JSDoc header if this remains part of the project standard.

## 18. TypeScript Configuration

Recommended configuration approach:

- Use strict TypeScript.
- Use `module` and `moduleResolution` settings that produce correct ESM imports in `dist/`.
- Prefer source imports with `.js` extensions.
- Use `verbatimModuleSyntax`.
- Use `import type` for type-only imports.
- Do not include DOM types in the core tsconfig unless required for `console` typing.
- If DOM types are excluded, provide a minimal internal console type or include Worker types.
- Keep React tsconfig separate and include DOM and React JSX settings.

Recommended tsconfig split:

| Config                    | Purpose                                          |
| ------------------------- | ------------------------------------------------ |
| `tsconfig.base.json`      | Shared strict compiler options.                  |
| `src/tsconfig.json`       | Core source typecheck.                           |
| `src/react/tsconfig.json` | React source typecheck with JSX and DOM.         |
| `tsconfig.build.json`     | Emit declarations and JavaScript to `dist/`.     |
| `test/*/tsconfig.json`    | Test-project-specific globals and runtime types. |

## 19. Tooling

The repository should mirror the consuming app's standards where practical.

Required tools:

- TypeScript for build and typechecking.
- Vitest for tests.
- `@cloudflare/vitest-pool-workers` for Worker runtime tests.
- jsdom for browser transport and React tests.
- ESLint flat config.
- Prettier.
- `npm-run-all2` for script orchestration.
- GitHub Actions with Node `>= 24`.

Husky recommendation:

- Do not use Husky to guarantee `dist/` freshness.
- A local pre-commit hook may be added later as a developer convenience only.
- CI must remain the authoritative enforcement mechanism.

## 20. Testing Strategy

The library should be fully testable with Vitest.

Use multiple Vitest projects so runtime-specific assumptions are explicit.

| Project   | Environment | Purpose                                               |
| --------- | ----------- | ----------------------------------------------------- |
| `node`    | Node        | Pure logic and Node-safe transports.                  |
| `browser` | jsdom       | Browser transport and React integration.              |
| `workers` | workerd     | Worker compatibility and structured console behavior. |
| `package` | Node        | Built package import and export validation.           |

Tests should import the module under test as `* as sut` unless a test requires a specific named import for clarity.

Use a fixed clock in logger tests:

```ts
const clock = () => new Date("2026-01-01T00:00:00.000Z");
```

### 20.1 Required Test Cases

Levels:

- Internal `LOG_LEVELS` keys and weights are covered through emitted `record.levelValue` values.
- Internal level lookup returns each documented weight.
- Invalid runtime input throws.

Logger:

- Default level is `info`.
- Injected clock is used.
- Default clock produces an ISO timestamp.
- Each level method sets `record.level` and `record.levelValue`.
- Level filtering suppresses lower-priority records.
- Disabled calls do not evaluate context getters.
- `isLevelEnabled()` returns correct values.
- Bindings merge with per-call context.
- Per-call context wins on collisions.
- Inputs are not mutated.
- Child loggers merge bindings correctly.
- Child loggers share transport, level, clock, and error handler.
- Parent loggers do not inherit child bindings.
- Top-level errors are serialized.
- Nested errors are not serialized unless they are top-level context values.
- Transport errors are caught.
- `onTransportError` is called for transport throws.
- Throws from `onTransportError` are swallowed.

Serialization:

- Plain `Error`.
- Error subclass with custom name.
- Error with stack.
- Error with cause.
- Non-error values.

Safe formatting:

- Plain object.
- Circular object.
- BigInt.
- Symbol.
- Function.
- Array.
- Throwing getter when practical to simulate.

Capture transport:

- Records are stored in order.
- `.records` cannot mutate internal storage.
- `clear()` empties storage.
- `find(level)` returns matching records and is the preferred test assertion helper for level-specific checks.
- No console output.

Silent transport:

- No console output.
- No throw.

Browser transport:

- Level-to-console-method mapping.
- Badge call shape.
- Message argument.
- Context as separate object argument.
- Empty context omitted.
- Style override.
- Missing method fallback.

Console transport:

- Timestamp variants.
- Color enabled and disabled output.
- Fixed-width level formatting.
- Context formatting.
- Sink split between `console.log` and `console.error`.
- Safe handling of circular and BigInt context.

Structured transport:

- Level-to-console-method mapping.
- Object payload shape.
- `stringify: true` behavior.
- Reserved-key precedence.
- Safe handling of circular and BigInt values in string mode.

Combine transport:

- Forwards in order.
- Attempts all transports when one throws.
- Throws first error when one child fails.
- Throws `AggregateError` when multiple children fail.
- Works with logger-level error isolation.

Resolve config:

- Full policy table.
- Unknown environment maps to production behavior.
- Undefined environment maps to production behavior.
- Production browser policy uses browser transport at `warn`.
- Production Worker policy uses structured transport at `warn`.
- Each call returns a fresh transport.

React:

- Provider supplies logger.
- Hook returns logger.
- Hook throws outside provider.
- Hook creates child logger when bindings are supplied.
- Child records include bindings.
- Logging routes through provided logger transport.
- Documentation examples avoid render-time logging.

Package:

- `npm run build` succeeds.
- `npm pack --dry-run --ignore-scripts` includes expected files.
- Built `dist/index.js` can be imported directly.
- Built `dist/react/index.js` can be imported directly when React is installed.
- Exported symbols match the documented public API.

### 20.2 Coverage

Coverage should use `@vitest/coverage-istanbul` unless there is a concrete reason to switch.

Recommended thresholds can start informational in v1 and become enforced once implementation stabilizes.

## 21. Documentation Deliverables

The implementation should include human and agent documentation.

Required files:

| File               | Audience              | Contents                                                         |
| ------------------ | --------------------- | ---------------------------------------------------------------- |
| `README.md`        | Human users           | Install, quick start, transports, React, testing, release model. |
| `SKILL.md`         | Coding agents         | Authoritative usage patterns and anti-patterns.                  |
| `docs/ENG_SPEC.md` | Maintainers           | Engineering contract and implementation plan.                    |
| `CHANGELOG.md`     | Maintainers and users | Release notes once versioned releases begin.                     |

README required sections:

- What the package does.
- Install from git tag.
- Core quick start.
- Worker production example.
- Browser development example.
- React provider example.
- Vitest capture example.
- Transport table.
- Default config policy table.
- Transport failure behavior.
- Security and privacy warning that v1 does not redact secrets.
- Cloudflare Workers Observability note.
- Troubleshooting missing `dist` or stale git tags.

SKILL required sections:

- When to use this package.
- Installation and import rules.
- Core logger usage.
- Transport selection.
- Testing with capture and silent transports.
- Capture `.find(level)` as the preferred level-specific assertion helper.
- React usage.
- Worker usage.
- Anti-patterns.
- Follow-on work not yet implemented.

## 22. Security And Privacy

v1 does not redact secrets or personally identifiable information.

Required documentation warning:

- Do not log secrets, tokens, passwords, cookies, API keys, private keys, or sensitive PII.
- Treat structured context as production log data.
- Cloudflare Workers Logs can index structured fields, so sensitive fields become searchable if logged.
- Use application-level care until redaction support exists.

Required implementation behavior:

- Do not inspect environment variables.
- Do not send logs to network services.
- Do not persist logs outside the selected transport.

## 23. Cloudflare Workers Observability

The structured transport is designed for Workers Logs.

Cloudflare recommends logging JSON objects from Workers because fields can be extracted and indexed. The production Worker default should therefore use `createStructuredTransport({ stringify: false })`.

Application documentation should remind users to enable Workers Observability in `wrangler.jsonc` when they want persisted logs.

Example:

```jsonc
{
  "observability": {
    "enabled": true,
    "head_sampling_rate": 1
  }
}
```

Sampling is an application deployment decision and should not be controlled by this logger.

## 24. Release Process

Recommended release flow:

1. Update source.
2. Update tests.
3. Update release metadata and documentation, including `package.json`, `README.md`, `SKILL.md`, and `CHANGELOG.md`.
4. Run `npm run release` to rebuild and stage `dist/`.
5. Run `npm run check`.
6. Verify staged `dist/` changes are intentional.
7. Run `npm pack --dry-run --ignore-scripts`.
8. Commit source, tests, docs, package metadata, and `dist/` together.
9. Tag the release, such as `1.0.0`.
10. Consumers depend on `github:adrianhall/cloudflare-logger#1.0.0`.

The `release` script is intentionally small. It should not update version numbers,
generate changelog text, create commits, or create tags. Those steps remain explicit so
release metadata can be reviewed before publishing a tag.

CI should run:

- `npm ci`.
- `npm run check`.
- `npm run test`.
- `npm run build`.
- `test -z "$(git status --porcelain -- dist)"`.
- `npm pack --dry-run --ignore-scripts`.

## 25. Implementation Plan

### Phase 1: Repository Scaffold

Tasks:

- Create `package.json`.
- Create TypeScript configs.
- Create ESLint and Prettier configs.
- Create Vitest root config with node, browser, workers, and package projects.
- Create minimal `wrangler.jsonc` for Worker tests.
- Create GitHub Actions workflow using Node `>= 24`.
- Create initial `README.md`, `SKILL.md`, and `CHANGELOG.md` placeholders.

Acceptance criteria:

- `npm install` succeeds.
- `npm run check:types` runs with no source files or placeholder files.
- Vitest discovers configured projects.
- CI can run the empty scaffold.

### Phase 2: Core Types And Levels

Tasks:

- Implement `types.ts`.
- Implement `levels.ts`.
- Add level tests.
- Add barrel exports.

Acceptance criteria:

- Level tests pass.
- Public types compile.
- Invalid runtime level input is handled as specified.

### Phase 3: Logger Engine

Tasks:

- Implement `serializeError()`.
- Implement `createLogger()`.
- Implement child logger behavior.
- Implement transport error isolation.
- Add logger and serialization tests.

Acceptance criteria:

- All logger semantics tests pass.
- Disabled calls do not touch context.
- Transport throws do not escape.
- `onTransportError` behavior is covered.

### Phase 4: Internal Formatting Helpers

Tasks:

- Implement internal safe JSON/string formatting.
- Implement internal console method fallback helpers.
- Add focused tests through transports or direct internal tests if project convention allows internal tests.

Acceptance criteria:

- Circular, BigInt, symbol, function, and fallback formatting are covered.
- Helpers are not exported from the package.

### Phase 5: Built-In Transports

Tasks:

- Implement capture transport.
- Implement silent transport.
- Implement browser transport.
- Implement console transport.
- Implement structured transport.
- Implement combine transport.
- Add all transport tests.

Acceptance criteria:

- Transport tests pass in the correct Vitest projects.
- Built-in transports do not throw for documented edge cases.
- Structured transport uses object logging by default.
- Combine transport attempts all children.

### Phase 6: Default Config Helper

Tasks:

- Implement `resolveLoggerConfig()`.
- Add policy table tests.
- Confirm `detectRuntime()` is omitted from the public API.

Acceptance criteria:

- Every policy table row is tested.
- Unknown and undefined environments map to production behavior.
- Each call returns a fresh transport.

### Phase 7: React Subpath

Tasks:

- Implement React context.
- Implement `LoggingProvider`.
- Implement `useLogger`.
- Add browser React tests.
- Verify core entry point does not import React.

Acceptance criteria:

- React tests pass.
- Hook throws clearly outside provider.
- Hook child logger behavior is covered.
- `@adrianhall/cloudflare-logger` remains React-free.

### Phase 8: Package Verification

Tasks:

- Implement build config.
- Generate `dist/`.
- Add package import tests against built output.
- Add `check:dist`.
- Add `check:pack`.
- Add `release` script that runs `npm run build && git add dist`.

Acceptance criteria:

- `npm run build` emits expected files.
- Direct imports from `dist/index.js` and `dist/react/index.js` work.
- `npm pack --dry-run --ignore-scripts` includes expected files.
- `check:dist` fails when source and committed `dist/` diverge.
- `npm run release` rebuilds and stages only the generated `dist/` files.

### Phase 9: Documentation Completion

Tasks:

- Complete `README.md`.
- Complete `SKILL.md`.
- Add release instructions.
- Add examples for tests, Worker, browser, and React.

Acceptance criteria:

- README examples compile or are mirrored by tests.
- Security warning is present.
- Transport failure behavior is documented.
- Git-tag installation instructions match the chosen distribution model.

### Phase 10: Release Candidate

Tasks:

- Run full checks locally.
- Run CI.
- Review package contents.
- Create release tag after approval.

Acceptance criteria:

- Full test suite passes.
- CI passes.
- `dist/` is committed and current.
- The package can be consumed from a git tag without running `prepare`.

## 26. Follow-On Work

Deferred features:

- Redaction support, likely as `withRedaction(transport, options)` or a `/redaction` subpath.
- Request ID and correlation ID conventions.
- Hono middleware under `/hono` once at least one concrete consumer shape is known.
- Async transports.
- Flush API.
- OpenTelemetry integration.
- Sentry integration.
- Tail Worker or Logpush integration guidance.
- Additional runtime detection helpers if multiple consumers need them.
- Browser production policy refinements after real usage.

## 27. Open Questions

No open questions remain for v1 implementation.
