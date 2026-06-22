# AGENTS.md

Guidance for coding agents working in `@adrianhall/cloudflare-logger`. Read this
before making changes. The authoritative engineering contract is
[`docs/ENG_SPEC.md`](./docs/ENG_SPEC.md); this file captures the conventions and
quality gates that are easy to miss.

## What this package is

A small, **synchronous**, structured logging library that runs across Vitest,
browsers, and Cloudflare Workers. The core is dependency-free. React lives behind
the `/react` subpath only.

Two public entry points:

| Import                                | Purpose                                        | Runtime                      |
| ------------------------------------- | ---------------------------------------------- | ---------------------------- |
| `@adrianhall/cloudflare-logger`       | Core logger, types, transports, config helper. | Browser, Worker, Node tests. |
| `@adrianhall/cloudflare-logger/react` | React provider and hook.                       | Browser React applications.  |

## Non-negotiable quality gates

Before considering any task complete, **both** of these MUST pass:

```sh
npm run check          # format, lint, types, dist freshness, pack
npm run test:coverage  # all Vitest projects + 100% coverage
```

- `npm run check` must report **zero errors**. It runs `check:format`,
  `check:lint`, `check:types`, `check:dist`, and `check:pack` via `run-s`.
- `npm run test:coverage` must report **100% coverage** on statements, branches,
  functions, and lines. The thresholds are enforced in `vitest.config.ts`, so a
  drop below 100% fails the run — it is not merely informational.

Do not lower the thresholds in `vitest.config.ts` to make a run pass. Close the
gap properly (see below).

## How to reach 100% coverage

When coverage drops below 100%, analyze the uncovered line and resolve it in this
priority order:

1. **Write a test.** If the gap is trivial to fill, or it is a path a real user
   can reach, add a test that exercises it. This is the default and strongly
   preferred outcome.
2. **Extract a small testable helper.** If a line is hard to reach because it is
   buried inside a larger function, factor it into a tiny, directly-importable
   helper and unit-test the helper in isolation. See the patterns below.
3. **Ignore the line — last resort only.** If, and only if, the test environment
   makes a line genuinely impractical to exercise, annotate it with:

   ```ts
   /* istanbul ignore next -- @preserve */
   ```

   The `-- @preserve` suffix keeps the comment from being stripped by the
   formatter/build. Always include a short justification on the same or
   preceding line explaining _why_ the line cannot be tested. Reserve this for
   true dead-ends (e.g. a host environment guard that no test runtime can
   trigger), not for lines that are merely inconvenient to set up.

There are currently **no** `istanbul ignore` annotations in `src/`. Keep it that
way unless absolutely necessary.

### Testable helper patterns

The codebase already uses two patterns to keep coverage at 100% without ignores.
Follow them rather than reaching for an ignore comment.

**Defensive guards** — small, centralized, individually-testable guard utilities
live in [`src/defensive-guards.ts`](./src/defensive-guards.ts). They are _not_
exported from the package entry point. When you need a defensive branch (e.g.
"only spread this property when defined"), put it in a named helper here and test
it directly in `test/node/defensive-guards.test.ts`. Example: `optionalField()`
turns an inline `x !== undefined ? { x } : {}` branch — which is awkward to cover
from every call site — into one helper with focused tests.

**Helpers exported for direct unit testing** — when a `JSON.stringify` replacer,
mapper, or similar callback has a branch that is hard to drive through the public
surface, lift it into a named exported function in the same module and test it
directly. Example: `replaceNonJsonValue()` in
[`src/internal/safe-json.ts`](./src/internal/safe-json.ts) is exported (from an
internal module, not the package barrel) specifically so its default return path
is reachable in a unit test. These helpers stay out of `src/index.ts` so they
never become public API.

Note: `src/**/index.ts` files are excluded from coverage (barrels), and so are
`*.d.ts` files. Everything else under `src/` is measured.

## Project structure

```text
src/
  index.ts            # core barrel — MUST NOT import React
  defensive-guards.ts # internal testable guards (not exported from barrel)
  levels.ts           # internal LOG_LEVELS + levelValue() (not exported)
  logger.ts           # createLogger() + child logger closure
  resolve.ts          # resolveLoggerConfig() policy helper
  serialize.ts        # serializeError()
  types.ts            # all public types
  internal/
    console.ts        # getConsoleMethod() console-method fallback
    safe-json.ts      # safeStringify() + replaceNonJsonValue()
  transports/
    browser.ts capture.ts combine.ts console.ts silent.ts structured.ts
  react/
    index.ts          # /react barrel
    context.ts        # React context object
    LoggingProvider.tsx
    useLogger.ts
test/
  node/      # plain Node — pure logic, Node-safe transports
  browser/   # jsdom — browser transport + React integration
  workers/   # workerd via @cloudflare/vitest-pool-workers
  package/   # built dist/ import + export validation
```

## Architectural rules (do not violate)

- **Core stays React-free.** `src/index.ts` and anything it imports must never
  import React. React belongs only under `src/react/`. A test in the package
  project guards this.
- **Core stays Worker-safe.** No Node-only APIs in `src/**` (except test/tooling
  files). The `workers` Vitest project runs without `nodejs_compat` on purpose —
  do not add it to satisfy a dependency without documenting why.
- **No runtime dependencies in the core.** Do not add logging libraries (Pino,
  Winston, Chalk, etc.). `react` is an optional peer dependency, used only by the
  `/react` subpath.
- **Factory functions, not classes.** All transports and loggers are created via
  `create*`/`combine*` factory functions.
- **Keep the public surface small.** Do not export internal helpers (safe
  stringify, console selection, level weights, defensive guards) from
  `src/index.ts`. Do not add a global singleton logger. Do not read environment
  variables inside the core.
- **Logging must never throw into application code.** `createLogger` wraps
  `transport.log()` in try/catch and routes failures to `onTransportError` (whose
  own throws are also swallowed). Built-in transports must be best-effort and
  non-throwing on their own. `combineTransports` attempts every child, then
  rethrows a single error or an `AggregateError`.
- **Never mutate caller input.** Bindings and per-call context are merged into a
  fresh object every time; per-call context wins on key collision.
- **Disabled log calls must not touch context.** Level filtering happens before
  the context argument is read (so a throwing getter on a suppressed call never
  runs). Preserve this — see `emit()` in `src/logger.ts`.
- **Use `.js` extensions in source imports.** This is required for correct
  emitted ESM (`module`/`moduleResolution: NodeNext`, `verbatimModuleSyntax`).
- **Use `import type` for type-only imports** (enforced by ESLint
  `consistent-type-imports`, inline style).

## Testing conventions

- Vitest runs as four projects (`node`, `browser`, `workers`, `package`), each
  with its own `test/<project>/vitest.config.ts`. Coverage config lives in the
  root `vitest.config.ts` only.
- Import the module under test as `import * as sut from "..."` unless a named
  import is clearly better for readability.
- Use a fixed clock in logger tests: `() => new Date("2026-01-01T00:00:00.000Z")`.
- Inject a console-like spy into transports via their optional `_console`
  parameter instead of patching the global `console`.
- Use the capture transport's `find(level)` as the preferred way to assert on
  records at a specific level.
- Put a test in the project whose runtime matches what it validates (e.g. browser
  transport + React → `test/browser/`; Worker structured-console behavior →
  `test/workers/`; built-`dist` checks → `test/package/`).

Run a single project while iterating:

```sh
npx vitest run --project node
npx vitest run --project browser
```

## File header convention

Each implementation file starts with a concise `@file` JSDoc header describing its
purpose. Match the existing style when adding files.

## Build, dist, and release

- `dist/` is committed and consumed directly from git tags — there is no
  `prepare` build for consumers. `check:dist` (via `scripts/check-dist.mjs`)
  fails when committed `dist/` diverges from source.
- After changing `src/`, regenerate output with `npm run release` (`tsc` build +
  `git add dist`) so `check:dist` stays green. Do not hand-edit `dist/`.
- `npm run check` and `npm run test:coverage` are the gates that matter; the
  full release flow lives in `docs/ENG_SPEC.md` §24.

## Creating a release

Follow these steps in order. Do not skip or reorder them. Every step must
succeed before moving to the next.

### 1. Decide the version number

Choose `X.Y.Z` following [Semantic Versioning](https://semver.org/). The tag
format is `X.Y.Z` — no `v` prefix.

### 2. Update `package.json`

Set `"version"` to the new `X.Y.Z` value.

### 3. Update `CHANGELOG.md`

Rename the `## [Unreleased]` heading to `## [X.Y.Z] — YYYY-MM-DD` and add a
new empty `## [Unreleased]` section above it. Document all changes since the
previous release under the appropriate subsections (`Added`, `Changed`,
`Fixed`, `Removed`).

### 4. Update `README.md`

Wherever the file contains an installation instruction or a reference to a
specific release tag, update it to `X.Y.Z`. At minimum this means any
`npm install` or `package.json` snippet that pins the git tag:

```
github:adrianhall/cloudflare-logger#X.Y.Z
```

### 5. Update `skills/cloudflare-logger/SKILL.md`

Apply the same version-tag update to any installation or import snippets in
the skill file so agents consuming the skill get the correct pin.

### 6. Run the quality gates

Both commands must exit zero:

```sh
npm run check          # format, lint, types, dist freshness, pack
npm run test:coverage  # all Vitest projects + 100% coverage
```

If either fails, fix the underlying issue before continuing. Do not lower
coverage thresholds or suppress lint errors to force a pass.

### 7. Rebuild and stage `dist/`

```sh
npm run release        # tsc build + git add dist
```

This regenerates `dist/` from source and stages all changed files under
`dist/`. Do not hand-edit `dist/`.

### 8. Verify the staged changes

```sh
git diff --cached --stat
```

The staged set must include:

- `package.json` (version bump)
- `CHANGELOG.md` (release entry)
- `README.md` (tag reference update, if present)
- `skills/cloudflare-logger/SKILL.md` (tag reference update, if present)
- `dist/` files (only generated output — no hand edits)

If unintended files are staged, unstage them before committing.

### 9. Commit with a conventional commit message

```sh
git commit -m "chore: release X.Y.Z"
```

Include all staged files (source, docs, and `dist/`) in a single commit.

### 10. Create the release tag

```sh
git tag X.Y.Z
```

No `v` prefix. The tag must point to the commit created in step 9.

### 11. Push the commit and tag

```sh
git push origin main
git push origin X.Y.Z
```

Consumers depend on the tag directly:

```
github:adrianhall/cloudflare-logger#X.Y.Z
```

The tag must be pushed before announcing the release. Once a tag is pushed
and consumed, do not delete or move it.

## Security

v1 does **not** redact secrets or PII. Never log tokens, passwords, cookies, API
keys, private keys, or sensitive PII in code or examples. Structured fields are
indexable by Cloudflare Workers Logs and therefore searchable.
