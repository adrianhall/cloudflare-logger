# `@adrianhall/cloudflare-logger` — Library Specification

> Status: **Draft v1** — for review. No implementation exists yet.
> Destination: standalone repository `adrianhall/cloudflare-logger`, consumed by
> applications as `github:adrianhall/cloudflare-logger#<tag>` (e.g. `#1.0.0`),
> mirroring `@adrianhall/cloudflare-auth`.
> This document is authored inside the `webmud` repo so its tooling/test/check
> conventions can be lifted verbatim; it will move to the new repo for implementation.

## 1. Overview & scope

A small, **zero-runtime-dependency**, **synchronous** structured logger that runs
identically in the browser, the Cloudflare Worker runtime (workerd), and Node (tests).
It separates **what** is logged (a `LogRecord`) from **where** it goes (a `Transport`),
so the same call sites behave correctly everywhere by swapping the transport.

The library is the **reusable engine**. It does **not** know about any specific
application's environment bindings or frameworks. Applications wrap it with a thin
adapter that decides which transport/level to use per environment (see the companion
`webmud` integration spec, `docs/specs/LOGGER.md`).

### Public surface (two entry points)

| Import                                | Contents                                                                                        | Runtime                                                                  |
| ------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `@adrianhall/cloudflare-logger`       | Engine: `createLogger`, transports, `resolveLoggerConfig`, types, level utils, `serializeError` | browser / workerd / Node (no React, no DOM assumptions beyond `console`) |
| `@adrianhall/cloudflare-logger/react` | `LoggingProvider`, `useLogger`                                                                  | browser (React)                                                          |

The core entry point **must not import React or any DOM-only globals** other than the
universally-available `console`. React lives exclusively under `/react` so Worker
bundles never pull it in.

### What the library provides

- `createLogger()` — constructs a `Logger` from explicit options.
- **Child loggers** — `logger.child({ requestId })` merges bound context into every
  record. Used to attach `requestId` (and similar) to all messages.
- **Transports:** capture, silent, browser (DevTools), console (colorized terminal),
  structured (Cloudflare Observability), and combine (tee).
- `resolveLoggerConfig(environment, runtime)` — a **default, overridable** policy
  mapping `(environment, runtime)` → `{ level, transport }`.
- `serializeError`, `LOG_LEVELS`, `levelValue`, `detectRuntime`.
- **React** integration under `/react`: `LoggingProvider` + `useLogger()`.

### Design decisions (carried from review)

| Decision            | Choice                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------- |
| Method signature    | `console`-like: `logger.info(message, context?)`                                            |
| Levels              | `trace`, `debug`, `info`, `warn`, `error`, `fatal`                                          |
| Transport selection | **Explicit** transport on `createLogger`; `resolveLoggerConfig` is an opt-in default policy |
| Test capture        | Instance-based **capture transport** exposing `.records` getter + `.clear()`                |
| Redaction           | **Out of scope** for v1 (see §14)                                                           |
| Dependencies        | **Zero runtime deps**; React is an optional peer for `/react` only                          |

## 2. Package & distribution

The package follows the same shipping model as `@adrianhall/cloudflare-auth`
(git-tag dependency, build-on-install via `prepare`, allowlisted install script).

### 2.1 `package.json` (shape)

```jsonc
{
  "name": "@adrianhall/cloudflare-logger",
  "version": "1.0.0",
  "type": "module",
  "license": "MIT",
  "sideEffects": false,
  "engines": { "node": ">= 25", "npm": ">= 11.6" },
  "files": ["dist"],
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
    "prepare": "run-s build",
    "check": "run-s check:*",
    "check:format": "prettier --check .",
    "check:lint": "eslint .",
    "check:types": "tsc -b",
    "fix": "run-s fix:*",
    "fix:format": "prettier --write .",
    "fix:lint": "eslint --fix .",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage"
  },
  "peerDependencies": {
    "react": ">= 19",
    "react-dom": ">= 19"
  },
  "peerDependenciesMeta": {
    "react": { "optional": true },
    "react-dom": { "optional": true }
  },
  "devDependencies": {
    "/* mirror webmud's toolchain versions */": "see §11"
  }
}
```

Notes:

- **ESM-only** (`"type": "module"`), tree-shakeable (`"sideEffects": false`).
- **`prepare` builds on install**, so a `github:` consumer gets a populated `dist/`.
  The consumer must add an `allowScripts` entry (see §2.3).
- React/`react-dom` are **optional peer dependencies** — core consumers (Workers) are
  not forced to install React; only `/react` users are.
- No runtime `dependencies`.

### 2.2 Build

- Build with **`tsc`** (no bundler needed) via a `tsconfig.build.json` that sets
  `noEmit: false`, `declaration: true`, `outDir: "dist"`, `rootDir: "src"`, preserving
  the `src/` tree so the `exports` map resolves `.` → `dist/index.js` and `./react` →
  `dist/react/index.js`. Emits `.js` + `.d.ts`.
- Rationale: zero extra build tooling, matches the repo's `tsc`-centric checks, and the
  output is debuggable (no minification). A bundler (tsup/rollup) is an option only if
  multi-format output is later required — not for v1.

### 2.3 Consumption (in `webmud` and others)

```jsonc
// package.json
"dependencies": {
  "@adrianhall/cloudflare-logger": "github:adrianhall/cloudflare-logger#1.0.0"
},
"allowScripts": {
  "@adrianhall/cloudflare-logger@1.0.0": true
}
```

Pin to a **git tag** (`#1.0.0`). Bumping is a deliberate tag change in the consumer,
matching the existing `cloudflare-auth`/`circlemud-parser` workflow.

## 3. Levels

```ts
export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export const LOG_LEVELS: Readonly<Record<LogLevel, number>> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60
};

export function levelValue(level: LogLevel): number;
```

- A record is emitted when `LOG_LEVELS[record.level] >= LOG_LEVELS[minLevel]`.
- Numeric weights are **stable public API** (do not renumber).

## 4. Core types

```ts
/** Structured fields attached to a log call or bound to a logger. */
export type LogContext = Record<string, unknown>;

/** A single normalized log entry handed to transports. */
export interface LogRecord {
  /** ISO-8601 timestamp (from the logger's injectable clock). */
  readonly time: string;
  /** Numeric level weight (see LOG_LEVELS). */
  readonly level: number;
  /** Level name. */
  readonly levelName: LogLevel;
  /** Human-readable message. */
  readonly message: string;
  /** Merged bindings + per-call context, after Error serialization. Empty object when none. */
  readonly context: LogContext;
}

/** A destination for log records. Synchronous. Shaped like a LogTape `Sink` for portability. */
export interface Transport {
  /** Write a single record. Must not throw. */
  log(record: LogRecord): void;
}

export interface CreateLoggerOptions {
  /** Minimum level to emit. Default: 'info'. */
  level?: LogLevel;
  /** Where records go. Required (explicit). */
  transport: Transport;
  /** Initial bound context, inherited by children. Default: {}. */
  bindings?: LogContext;
  /** Clock for timestamps; injectable for deterministic tests. Default: () => new Date(). */
  clock?: () => Date;
}

export interface Logger {
  trace(message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  fatal(message: string, context?: LogContext): void;

  /** Create a child logger that merges `bindings` into every record. */
  child(bindings: LogContext): Logger;

  /** The effective minimum level. */
  readonly level: LogLevel;

  /** True if a message at `level` would be emitted. */
  isLevelEnabled(level: LogLevel): boolean;
}
```

## 5. `createLogger` semantics

```ts
export function createLogger(options: CreateLoggerOptions): Logger;
```

- **Short-circuit:** each level method first checks `isLevelEnabled`. If disabled, it
  returns immediately without building a record or touching `context`.
- **Merge order:** record `context` = `{ ...bindings, ...callContext }` (call context
  wins on key collision).
- **Child:** `child(b)` returns a new `Logger` sharing the same `transport`, `level`,
  and `clock`, with `bindings = { ...parentBindings, ...b }`. Children are independent;
  nesting is unbounded; parent records never contain child bindings.
- **No mutation:** input `context`/`bindings` objects are never mutated.
- **Transports must not throw.** v1 does not wrap `transport.log` in try/catch (see §13).

### Error serialization

When a context value is an `Error` instance (top level of the merged context), it is
replaced before reaching the transport:

```ts
export function serializeError(err: unknown): unknown;
// Error → { name: string; message: string; stack?: string; cause?: unknown }
// non-Error → returned unchanged
```

- Convention: pass errors under the `err` key — `logger.error('save failed', { err })`.
- Only top-level values are inspected (not deep). `cause` is included when present
  (shallow).

## 6. Transports

Level filtering is performed by the **logger**, not the transport, so transports
receive only records that should be emitted. (Capture is therefore paired with
`level: 'trace'` when a test wants everything.)

### 6.1 Capture — `createCaptureTransport()`

```ts
export interface CaptureTransport extends Transport {
  /** Immutable view of captured records, in order. */
  readonly records: readonly LogRecord[];
  /** Discard all captured records. */
  clear(): void;
  /** Convenience: records whose levelName === level. */
  find(level: LogLevel): readonly LogRecord[];
}

export function createCaptureTransport(): CaptureTransport;
```

Stores every record; emits nothing externally. `.records` is a read-only snapshot.

### 6.2 Silent — `createSilentTransport()`

A no-op transport. For true silence where even capture is unwanted.

### 6.3 Browser — `createBrowserTransport(options?)`

Writes to browser DevTools so entries render with correct severity icons, are
filterable, and context is an expandable object.

- **Console method mapping:** `trace`/`debug` → `console.debug`; `info` → `console.info`;
  `warn` → `console.warn`; `error`/`fatal` → `console.error`.
- **Call shape:** styled `%c` level badge, the message, then the context object passed
  as a **separate argument** (inspectable tree, not stringified); context omitted when
  empty.
- Options: `{ levelStyles?: Partial<Record<LogLevel, string>> }`.

### 6.4 Console (colorized) — `createConsoleTransport(options?)`

ANSI-colorized, timestamped, one line per record, for `wrangler dev` / terminal.

- **Format:** `<time> <LEVEL> <message> <context?>`; `LEVEL` color-coded & fixed-width;
  context rendered as compact JSON when non-empty, dimmed.
- **Sink:** `warn`/`error`/`fatal` → `console.error`; else `console.log`.
- Options: `{ colors?: boolean; timestamp?: 'time' | 'iso' | false }` (defaults `true`,
  `'time'`). ANSI codes are inlined (no `chalk`).

### 6.5 Structured — `createStructuredTransport(options?)`

One structured object per record to the level-appropriate `console` method, for
Cloudflare Workers Observability.

- **Console method mapping:** `trace`/`debug` → `console.debug`; `info` → `console.log`;
  `warn` → `console.warn`; `error`/`fatal` → `console.error`.
- **Payload (single object arg):** `{ time, level: levelName, message, ...context }`.
  Reserved keys (`time`, `level`, `message`) take precedence over context keys.
- Options: `{ stringify?: boolean }` (default `false` → pass object; `true` →
  `JSON.stringify`).

### 6.6 Combine — `combineTransports(...transports)`

Forwards each record to every transport in order. E.g.
`combineTransports(capture, createConsoleTransport())`.

## 7. Default policy — `resolveLoggerConfig`

A small, overridable policy so consumers don't re-derive the common mapping. Apps may
ignore it and construct transports directly.

```ts
export type Environment = "test" | "development" | "production";
export type Runtime = "browser" | "worker";

export interface ResolvedLoggerConfig {
  level: LogLevel;
  transport: Transport;
}

/** Pure default policy. Creates a fresh transport per call. */
export function resolveLoggerConfig(
  environment: Environment,
  runtime: Runtime
): ResolvedLoggerConfig;

/** Best-effort runtime detection: 'browser' if window+document exist, else 'worker'. */
export function detectRuntime(): Runtime;
```

### Default policy table

| `environment` | `runtime` | `level` | transport                         |
| ------------- | --------- | ------- | --------------------------------- |
| `test`        | any       | `trace` | capture (no emit)                 |
| `development` | `browser` | `info`  | browser DevTools                  |
| `development` | `worker`  | `debug` | console (colorized + timestamped) |
| `production`  | `worker`  | `warn`  | structured                        |
| `production`  | `browser` | `warn`  | structured                        |

- Unknown `environment` → treated as `production`.
- For `test`, the transport is a fresh capture instance; tests that assert on records
  should construct the logger directly with `createCaptureTransport()` (see §12) rather
  than rely on the resolver's internal instance.

## 8. React subpath — `@adrianhall/cloudflare-logger/react`

Provides a context provider and hook so React trees consume a single configured logger
and add component/feature-scoped bindings via child loggers.

```ts
import type { Logger, LogContext } from "@adrianhall/cloudflare-logger";

export interface LoggingProviderProps {
  /** A fully-configured root logger (built by the app, e.g. via resolveLoggerConfig). */
  logger: Logger;
  /** React subtree. */
  children: React.ReactNode;
}

/** Provides `logger` to descendants via context. */
export function LoggingProvider(props: LoggingProviderProps): React.JSX.Element;

/**
 * Returns the provided logger. If `bindings` are supplied, returns a memoized child
 * logger (`logger.child(bindings)`) stable across renders for the same provider logger
 * and binding values.
 */
export function useLogger(bindings?: LogContext): Logger;
```

Semantics:

- The provider stores the `logger` in a React context (internal `LoggerContext`, not
  exported).
- `useLogger()` returns the context logger; **throws** a clear error when used outside a
  `LoggingProvider`.
- `useLogger(bindings)` returns `useMemo(() => logger.child(bindings), [logger, <stable
binding deps>])`. Bindings are shallow-compared via stable serialization of entries so
  inline object literals don't thrash the memo. (Open question §13: exact memo key.)
- The provider is **logger-prop based** (explicit injection). It does **not** read
  environment or build a logger itself — that decision belongs to the app, keeping the
  library framework-glue free of policy. Apps typically build the browser logger with
  `createLogger(resolveLoggerConfig(env, 'browser'))` and pass it in.

Example (app side):

```tsx
import { createLogger, resolveLoggerConfig } from "@adrianhall/cloudflare-logger";
import { LoggingProvider, useLogger } from "@adrianhall/cloudflare-logger/react";

const logger = createLogger(resolveLoggerConfig("development", "browser"));

function Root() {
  return (
    <LoggingProvider logger={logger}>
      <App />
    </LoggingProvider>
  );
}

function Widget() {
  const log = useLogger({ component: "Widget" });
  log.info("rendered");
  return null;
}
```

## 9. File layout

```text
src/
  index.ts                 # core barrel (public API)
  levels.ts                # LogLevel, LOG_LEVELS, levelValue
  types.ts                 # LogContext, LogRecord, Transport, CreateLoggerOptions, Logger
  logger.ts                # createLogger + child
  serialize.ts             # serializeError
  resolve.ts               # Environment, Runtime, ResolvedLoggerConfig,
                           #   resolveLoggerConfig, detectRuntime
  transports/
    capture.ts
    silent.ts
    browser.ts
    console.ts
    structured.ts
    combine.ts
  react/
    index.ts               # react barrel: LoggingProvider, useLogger
    context.ts             # internal LoggerContext (not exported)
    LoggingProvider.tsx
    useLogger.ts
test/
  node/                    # pure-logic + Node-safe transports
  workers/                 # workerd compatibility (structured/console under workerd)
  browser/                 # browser transport + React provider/hook (jsdom)
```

### Barrels

Follow the project convention (`src/worker/middleware/index.ts`): `@file` JSDoc header,
alphabetized, combined value + `type` exports, no file extensions.

- **`src/index.ts`** exports: `createLogger`, `LOG_LEVELS`, `levelValue`,
  `serializeError`, `createCaptureTransport`, `createSilentTransport`,
  `createBrowserTransport`, `createConsoleTransport`, `createStructuredTransport`,
  `combineTransports`, `resolveLoggerConfig`, `detectRuntime`; types `Logger`,
  `LogLevel`, `LogContext`, `LogRecord`, `Transport`, `CreateLoggerOptions`,
  `CaptureTransport`, `Environment`, `Runtime`, `ResolvedLoggerConfig`.
- **`src/react/index.ts`** exports: `LoggingProvider`, `useLogger`, type
  `LoggingProviderProps`.

## 10. Tooling & checks (lifted from `webmud`)

The repo reproduces webmud's toolchain so `npm run check` enforces the same standards.

- **Prettier** — identical config: `singleQuote: true`, `semi: true`,
  `trailingComma: "none"`, `arrowParens: "always"`, `bracketSameLine: true`,
  `bracketSpacing: true`, `jsxSingleQuote: false`, `quoteProps: "consistent"`;
  `printWidth` effectively 100 via `.editorconfig`.
- **ESLint (flat)** — `@eslint/js` recommended, `typescript-eslint`
  `recommendedTypeChecked` + `no-deprecated`, `eslint-plugin-jsdoc`
  `flat/recommended-typescript-error` with the **same tightened JSDoc rules** (required
  on `FunctionDeclaration`, `MethodDefinition`, `ClassDeclaration`, exported arrows,
  **all interfaces & type aliases**; `@param`/`@returns`/`@throws` descriptions
  required; types not duplicated). React rules (`react-hooks`, `react-refresh`) apply to
  `src/react/**`. Test files relax `no-explicit-any`/unsafe rules and JSDoc, as in
  webmud.
- **TypeScript** — `tsconfig.base.json` identical strictness (`strict`,
  `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`,
  `erasableSyntaxOnly`, `verbatimModuleSyntax`, `noFallthroughCasesInSwitch`,
  `moduleResolution: "bundler"`, ES2023). **`import type` everywhere** for type-only
  imports. Co-located tsconfigs:
  - `src/tsconfig.json` — core, **no DOM lib** (proves the core doesn't use DOM beyond
    `console`, which is in the default lib).
  - `src/react/tsconfig.json` — `lib: ["ES2023", "DOM"]`, `jsx: "react-jsx"`,
    `types: ["react"]`.
  - `tsconfig.build.json` — emit config (`noEmit: false`, `declaration: true`,
    `outDir: dist`, `rootDir: src`).
  - per-test-project tsconfigs.
- **File headers** — every file opens with `/** @file <relative path> … */`.
- **Scripts** — `check`/`fix` via `npm-run-all2` (`run-s`), exactly as webmud.

## 11. Testing strategy

Three Vitest **projects** (mirroring webmud's split), aggregated by a root
`vitest.config.ts`. Coverage via `@vitest/coverage-istanbul` (`text`/`json`/`lcov`,
`skipFull: true`). Tests live under `test/` mirroring `src/`; module under test imported
as `* as sut`; a fixed `clock` makes `record.time` deterministic; `vi.spyOn(console, …)`
asserts console-emitting transports.

### 11.1 Projects

- **`node`** (`environment: 'node'`, `tsconfigPaths: true`) — pure logic and Node-safe
  transports: `levels`, `logger`, `serialize`, `capture`, `silent`, `structured`,
  `console`, `combine`, `resolve`.
- **`workers`** (`@cloudflare/vitest-pool-workers`, `cloudflareTest({ wrangler })`) —
  **workerd compatibility**: `createLogger` + `createStructuredTransport` +
  `createConsoleTransport` behave under the real Workers runtime (console semantics,
  no Node-only API usage, `detectRuntime() === 'worker'`). A minimal `wrangler.jsonc`
  with `compatibility_flags: ["nodejs_compat"]` + `observability.enabled` is included
  for the test runtime.
- **`browser`** (`environment: 'jsdom'`, `globals: true`, `@testing-library/react`,
  `@testing-library/jest-dom`) — `createBrowserTransport` and the React provider/hook;
  `detectRuntime() === 'browser'`.

### 11.2 Cases (by file)

**levels** — `LOG_LEVELS` keys/weights/order; `levelValue` per level.

**logger** — each method's `levelName`/`level`; level filtering (e.g. `warn` suppresses
`info`/`debug`/`trace`); `isLevelEnabled` across levels; **short-circuit** (transport
`log` not called when disabled; a getter inside `context` is never accessed); context
merge precedence; default level `info`; default clock yields ISO; injected clock used
exactly; inputs not mutated; **child** (merge, multi-level accumulation, shared
transport/level/clock, isolation from parent); Error serialization (`err` → `{ name,
message, stack }`, `cause`, non-Error untouched, top-level only).

**serialize** — `Error`, subclass with custom `name`, error with `cause`, non-Error.

**transports/capture** — ordered accumulation; `.records` read-only; `.clear()`;
`.find(level)`; no console output.

**transports/silent** — no-op; no console; no throw.

**transports/browser** (browser project) — level→method mapping; `%c` badge present;
message passed; context as **separate object arg** (not stringified); empty context
omitted; `levelStyles` override.

**transports/console** — formatted time + fixed-width level + message + compact-JSON
context; sink split (`warn`+ → `console.error`); `colors:false` strips ANSI;
`timestamp` variants.

**transports/structured** — level→method mapping; payload has `time`/`level`/`message` + flattened context; `stringify:true` emits string; reserved-key precedence.

**transports/combine** — forwards to all in order; capture+silent combo; three
transports.

**resolve** — `resolveLoggerConfig` truth table (every `(environment, runtime)` cell →
documented `level` + expected transport kind); unknown env → production; `detectRuntime`
returns `'browser'` in jsdom and `'worker'` in workers project.

**react/LoggingProvider + useLogger** (browser project) — provides logger; `useLogger()`
returns it; **throws** outside a provider; `useLogger(bindings)` returns a child whose
records include bindings; memo stable across re-render with equal bindings; logs route
through the provided logger's transport (assert via a capture transport).

**barrels** (`index.ts`, `react/index.ts`) — every documented symbol exported & defined.

## 12. Testing **applications** that use this library

1. **Capture (recommended).** Construct directly with a capture transport at `trace`:

   ```ts
   const transport = createCaptureTransport();
   const logger = createLogger({
     level: "trace",
     transport,
     clock: () => new Date("2026-01-01T00:00:00Z")
   });
   // exercise code …
   expect(transport.records).toContainEqual(
     expect.objectContaining({ levelName: "warn", message: "rate limited" })
   );
   ```

2. **Silence.** Use `createSilentTransport()` when no output and no assertions are
   needed.

## 13. Open questions

1. **Transport error isolation** — wrap `transport.log` in try/catch, or keep the
   "transports must not throw" contract?
2. **`useLogger` memo key** — how to derive a stable dependency from `bindings`
   (JSON of sorted entries vs. shallow-equal hook vs. requiring the caller to memoize)?
3. **Should `/react` also export a `useChildLogger(bindings)`** as a clearer alias, or
   is `useLogger(bindings)` enough?
4. **`detectRuntime` granularity** — do we need a `'node'` value distinct from
   `'worker'`, or is the binary browser/non-browser split sufficient?
5. **Package name** — the engine is runtime-agnostic; only the structured transport is
   Cloudflare-specific. Keep `cloudflare-logger` (ecosystem branding) or a neutral name?

## 14. Future work

- **Redaction** — `withRedaction(transport, keys)` wrapper composing with
  `combineTransports`; or a future `/redaction` subpath.
- **Async/flushing transports** — optional `flush(): Promise<void>` for network sinks.
- **Additional sinks** — OpenTelemetry / Sentry subpaths.
- **`/hono` subpath** — a generic Hono middleware if a second Hono consumer appears
  (currently the Hono glue lives in each app because it depends on app-specific env
  bindings; see `docs/specs/LOGGER.md`).

## 15. Bundled skill (for the new repo)

Ship a `SKILL.md` (mirroring `@adrianhall/cloudflare-auth`'s skill) so agents get
authoritative usage instructions. Outline:

- **Install** — `github:` tag dependency + the required `allowScripts` entry.
- **Quick start** — `createLogger`, the six level methods, `child` for `requestId`.
- **Transports** — when to use each; pairing capture with `level: 'trace'` in tests.
- **Environment policy** — `resolveLoggerConfig` table; building per-runtime loggers.
- **React** — `LoggingProvider` + `useLogger`, building the browser logger.
- **Testing** — capture/silence patterns; the dual-runtime (workerd + browser) matrix.
- **Anti-patterns** — importing `/react` into Worker code; relying on the resolver's
  internal capture instance for assertions; deep context expecting deep Error
  serialization.
