# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Published package now includes `src/` so emitted JS source maps (`dist/**/*.js.map`) and
  declaration maps (`dist/**/*.d.ts.map`) can resolve their source references inside
  `node_modules`. Eliminates "Sourcemap … points to missing source files" warnings under
  Vite, Rollup, esbuild, and Vitest consumers, and restores "Go to Definition" from `.d.ts`
  into library source. Fixes #8.

## [1.0.1] — 2026-06-22

### Added

- Hono subpath (`@adrianhall/cloudflare-logger/hono`): `loggingMiddleware` Hono
  middleware that attaches a request-scoped logger to `c.var.LOGGER` and logs each
  request and response at `trace`. It resolves the environment from an optional
  argument or `c.env.ENVIRONMENT`, derives a correlation id from the `CF-Ray` header
  (falling back to `crypto.randomUUID()`), records request/response headers and cookie
  **names** only, redacts the `Authorization` and `CF-Access-Jwt-Authorization` headers
  to a presence indicator, includes response `status` and `durationMs`, and logs a
  64-byte response body preview. Exposes `LoggingMiddlewareOptions`, `LoggerBindings`,
  and `LoggerVariables` types. `hono` is an optional peer dependency (`>= 4`) used only
  by this subpath; the core entry point never imports it.

## [1.0.0] — 2026-06-22

### Added

- Repository scaffold: `package.json`, TypeScript project configs, ESLint and
  Prettier configuration, multi-project Vitest setup (node, browser, workers,
  package), minimal `wrangler.jsonc` for Worker tests, GitHub Actions CI, and
  placeholder documentation (ENG_SPEC.md Phase 1).
- Core public types: `LogLevel`, `LogContext`, `LogRecord`, `Transport`,
  `TransportErrorHandler`, `CreateLoggerOptions`, `Logger`, `Environment`,
  `Runtime`, `ResolvedLoggerConfig`, `BrowserTransportOptions`,
  `ConsoleTransportOptions`, `StructuredTransportOptions`, and `CaptureTransport`
  (ENG_SPEC.md Phase 2).
- Internal `LOG_LEVELS` map and `levelValue()` helper in `src/levels.ts` with
  numeric weights `trace=10`, `debug=20`, `info=30`, `warn=40`, `error=50`,
  `fatal=60` (ENG_SPEC.md Phase 2).
- `serializeError()` — converts top-level `Error` values to plain objects with
  `name`, `message`, `stack`, and shallow-serialized `cause` (ENG_SPEC.md Phase 3).
- `createLogger()` — synchronous logger factory with level filtering, bindings
  merge, per-call context merge, Error serialization, transport try/catch
  isolation, `onTransportError` callback, child logger support, and injected clock
  (ENG_SPEC.md Phase 3).
- Internal `safeStringify()` and `replaceNonJsonValue()` in `src/internal/safe-json.ts`
  handling circular references, `bigint`, `Symbol`, and `Function` values
  (ENG_SPEC.md Phase 4).
- Internal `getConsoleMethod()` and `ConsoleLike` type in `src/internal/console.ts`
  for console method selection with `console.log` fallback (ENG_SPEC.md Phase 4).
- Internal `optionalField()` defensive guard in `src/defensive-guards.ts`
  (ENG_SPEC.md Phase 4).
- `createCaptureTransport()` — in-memory capture transport with `.records`,
  `.find(level)`, and `.clear()` for Vitest test assertions (ENG_SPEC.md Phase 5).
- `createSilentTransport()` — no-op transport that discards all records
  (ENG_SPEC.md Phase 5).
- `createBrowserTransport()` — browser DevTools transport with `%c` styled level
  badges, level-to-console-method mapping, and optional style overrides
  (ENG_SPEC.md Phase 5).
- `createConsoleTransport()` — human-readable terminal transport with ANSI colors,
  configurable timestamp format (`"time"` | `"iso"` | `false`), fixed-width level
  labels, and safe JSON context formatting (ENG_SPEC.md Phase 5).
- `createStructuredTransport()` — Cloudflare Workers Logs transport with object or
  string payload modes; default object mode for Workers Logs field indexing
  (ENG_SPEC.md Phase 5).
- `combineTransports()` — fan-out transport that attempts all children and throws
  a single error or `AggregateError` after all have been attempted
  (ENG_SPEC.md Phase 5).
- `resolveLoggerConfig()` — policy helper mapping environment and runtime to a
  fresh `{ level, transport }` pair covering all eight rows of the policy table
  (ENG_SPEC.md Phase 6).
- React subpath (`@adrianhall/cloudflare-logger/react`): `LoggingContext`,
  `LoggingProvider`, and `useLogger` hook with memoized child logger support
  (ENG_SPEC.md Phase 7).
- Built `dist/` with committed ESM JavaScript, declaration files, and source maps
  for all modules; `scripts/check-dist.mjs` freshness check; `check:dist` and
  `check:pack` npm scripts; `release` script (ENG_SPEC.md Phase 8).
- Package-project Vitest tests (`test/package/dist-import.test.ts`) validating
  direct imports from `dist/index.js` and `dist/react/index.js` and the exported
  public API surface (ENG_SPEC.md Phase 8).
- Full `README.md` with install instructions, quick start, Worker production
  example, browser development example, React provider example, Vitest capture
  example, transport reference table, default config policy table, transport
  failure behavior documentation, child logger and error serialization sections,
  security and privacy warning, Workers Observability note, and troubleshooting
  guide (ENG_SPEC.md Phase 9).
- Full `skills/cloudflare-logger/SKILL.md` agent usage guide covering when to use
  the package, installation and import rules, core logger usage, transport
  selection, testing with capture and silent transports, `capture.find(level)` as
  the preferred level-specific assertion helper, React usage, Worker usage,
  anti-patterns, and follow-on work not yet implemented (ENG_SPEC.md Phase 9).
