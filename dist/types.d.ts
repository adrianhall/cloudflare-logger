/**
 * @file Core public types for `@adrianhall/cloudflare-logger`.
 *
 * These types form the stable public contract for v1. Numeric level values
 * are fixed once v1 is released; the string `LogLevel` union is the primary
 * API surface for TypeScript consumers.
 */
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
/**
 * Environment hint for `resolveLoggerConfig`.
 * The `(string & {})` tail keeps the type open for custom environment names
 * while preserving autocomplete for the well-known values.
 */
export type Environment = "test" | "development" | "production" | (string & {});
/** Runtime hint for `resolveLoggerConfig`. */
export type Runtime = "browser" | "worker";
/** Output of `resolveLoggerConfig`. */
export interface ResolvedLoggerConfig {
    readonly level: LogLevel;
    readonly transport: Transport;
}
/**
 * Options for `createBrowserTransport`.
 * `levelStyles` allows overriding the CSS style string applied to the level
 * badge for any subset of levels.
 */
export interface BrowserTransportOptions {
    readonly levelStyles?: Partial<Record<LogLevel, string>>;
}
/** Options for `createConsoleTransport`. */
export interface ConsoleTransportOptions {
    readonly colors?: boolean;
    readonly timestamp?: "time" | "iso" | false;
}
/** Options for `createStructuredTransport`. */
export interface StructuredTransportOptions {
    readonly stringify?: boolean;
}
/**
 * `CaptureTransport` extends `Transport` with test-ergonomic helpers.
 *
 * `.find(level)` is the preferred way to assert on records at a specific
 * level in tests; it avoids iterating `.records` manually.
 */
export interface CaptureTransport extends Transport {
    readonly records: readonly LogRecord[];
    clear(): void;
    find(level: LogLevel): readonly LogRecord[];
}
//# sourceMappingURL=types.d.ts.map