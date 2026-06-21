/**
 * @file Numeric level weights for `@adrianhall/cloudflare-logger`.
 *
 * `LOG_LEVELS` and `levelValue()` are internal implementation details in v1.
 * They are not exported from the package entry point. Numeric values are
 * stable for the emitted `LogRecord.levelValue` field once v1 is released.
 */

import type { LogLevel } from "./types.js";

/**
 * Stable numeric weights for each log level.
 *
 * A record is emitted when:
 *   `LOG_LEVELS[record.level] >= LOG_LEVELS[logger.level]`
 */
export const LOG_LEVELS: Readonly<Record<LogLevel, number>> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60
};

/**
 * Return the numeric weight for `level`.
 *
 * Throws a `TypeError` for any value that is not a recognized `LogLevel`.
 * TypeScript consumers should rely on the `LogLevel` union type and never
 * reach this error path under normal usage.
 */
export function levelValue(level: LogLevel): number {
  const value = LOG_LEVELS[level];
  if (value === undefined) {
    throw new TypeError(
      `Unknown log level: ${String(level)}. Expected one of: ${Object.keys(LOG_LEVELS).join(", ")}`
    );
  }
  return value;
}
