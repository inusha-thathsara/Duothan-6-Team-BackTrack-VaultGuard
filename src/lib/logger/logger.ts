/**
 * VaultGuard — Structured JSON Logger with PII Redactor (NFR-O1, NFR-S7).
 */

const PII_KEYS = [
  "password",
  "passwordhash",
  "secret",
  "token",
  "accesstoken",
  "refreshtoken",
  "cardnumber",
  "cvv",
  "ssn",
  "nationalid",
  "pin",
  "authorization",
  "backupcodes",
];

export function redactObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") return obj;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(redactObject);

  const redacted: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (PII_KEYS.some((pii) => lowerKey.includes(pii))) {
      redacted[key] = "[REDACTED]";
    } else if (typeof val === "object" && val !== null) {
      redacted[key] = redactObject(val);
    } else {
      redacted[key] = val;
    }
  }
  return redacted;
}

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  correlationId?: string;
  context?: Record<string, unknown>;
  error?: string;
}

export class Logger {
  private static instance: Logger;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error | unknown,
    correlationId?: string
  ) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(correlationId && { correlationId }),
      ...(context && { context: redactObject(context) as Record<string, unknown> }),
      ...(error && {
        error: error instanceof Error ? error.stack || error.message : String(error),
      }),
    };

    const formatted = JSON.stringify(entry);

    switch (level) {
      case "error":
        console.error(formatted);
        break;
      case "warn":
        console.warn(formatted);
        break;
      case "debug":
        if (process.env.NODE_ENV !== "production") {
          console.debug(formatted);
        }
        break;
      default:
        console.log(formatted);
        break;
    }
  }

  info(message: string, context?: Record<string, unknown>, correlationId?: string) {
    this.log("info", message, context, undefined, correlationId);
  }

  warn(message: string, context?: Record<string, unknown>, correlationId?: string) {
    this.log("warn", message, context, undefined, correlationId);
  }

  error(
    message: string,
    error?: Error | unknown,
    context?: Record<string, unknown>,
    correlationId?: string
  ) {
    this.log("error", message, context, error, correlationId);
  }

  debug(message: string, context?: Record<string, unknown>, correlationId?: string) {
    this.log("debug", message, context, undefined, correlationId);
  }
}

export const logger = Logger.getInstance();
