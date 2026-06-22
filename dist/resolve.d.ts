/**
 * @file Default config helper for `@adrianhall/cloudflare-logger`.
 *
 * `resolveLoggerConfig()` maps an environment + runtime pair to a ready-to-use
 * `{ level, transport }` pair.  It is optional policy — `createLogger` does
 * not require it.  Applications that need environment-specific configuration
 * without hand-wiring transports can call this helper and pass the result
 * directly to `createLogger`.
 *
 * Policy table (from ENG_SPEC.md §15):
 *
 * | Environment   | Runtime   | Level   | Transport  |
 * |---------------|-----------|---------|------------|
 * | test          | browser   | trace   | capture    |
 * | test          | worker    | trace   | capture    |
 * | development   | browser   | info    | browser    |
 * | development   | worker    | debug   | console    |
 * | production    | browser   | warn    | browser    |
 * | production    | worker    | warn    | structured |
 * | unknown       | browser   | warn    | browser    |
 * | unknown       | worker    | warn    | structured |
 *
 * `detectRuntime()` is intentionally omitted from the public API in v1.
 * Applications are expected to know whether they are constructing a browser
 * logger or a Worker logger.
 */
import type { Environment, ResolvedLoggerConfig, Runtime } from "./types.js";
/**
 * Resolve a `{ level, transport }` configuration for the given environment
 * and runtime.
 *
 * Each call creates a **fresh** transport instance.  If you call this helper
 * more than once with the same arguments you will receive independent
 * transport instances, which is intentional for test isolation.
 *
 * Unknown or `undefined` environments are treated as `"production"`.
 *
 * @param environment - One of `"test"`, `"development"`, `"production"`, or
 *   any other string.  `undefined` maps to production behavior.
 * @param runtime - Either `"browser"` or `"worker"`.
 * @returns A fresh `ResolvedLoggerConfig` ready to pass to `createLogger`.
 */
export declare function resolveLoggerConfig(environment: Environment | undefined, runtime: Runtime): ResolvedLoggerConfig;
//# sourceMappingURL=resolve.d.ts.map