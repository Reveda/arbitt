import fs from "node:fs";
import path from "node:path";
import winston from "winston";
import { env } from "./env";

type LogMeta = Record<string, unknown>;
type LogInput = string | LogMeta;

type LogMethod = {
  (message: string, meta?: LogMeta): void;
  (meta: LogMeta, message: string): void;
};

type AppLogger = {
  debug: LogMethod;
  info: LogMethod;
  warn: LogMethod;
  error: LogMethod;
  fatal: LogMethod;
};

const developmentFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const { level, message, timestamp, ...metadata } = info;
    const meta = Object.keys(metadata).length ? ` ${JSON.stringify(metadata)}` : "";
    return `${timestamp} ${level}: ${message}${meta}`;
  }),
);

const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

function createTransports() {
  const transports: winston.transport[] = [new winston.transports.Console()];

  if (!env.LOG_TO_FILE) {
    return transports;
  }

  const logDir = path.resolve(process.cwd(), env.LOG_DIR);
  fs.mkdirSync(logDir, { recursive: true });

  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, "app.log"),
      level: "info",
      maxFiles: env.LOG_MAX_FILES,
      maxsize: env.LOG_MAX_SIZE_BYTES,
    }),
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
      maxFiles: env.LOG_MAX_FILES,
      maxsize: env.LOG_MAX_SIZE_BYTES,
    }),
  );

  return transports;
}

const winstonLogger = winston.createLogger({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  format: env.NODE_ENV === "production" ? productionFormat : developmentFormat,
  transports: createTransports(),
});

function writeLog(
  level: "debug" | "info" | "warn" | "error",
  first: LogInput,
  second?: string | LogMeta,
) {
  if (typeof first === "string") {
    winstonLogger.log(level, first, typeof second === "object" ? second : undefined);
    return;
  }

  winstonLogger.log(level, typeof second === "string" ? second : "", first);
}

export const logger: AppLogger = {
  debug: (first, second) => writeLog("debug", first, second),
  info: (first, second) => writeLog("info", first, second),
  warn: (first, second) => writeLog("warn", first, second),
  error: (first, second) => writeLog("error", first, second),
  fatal: (first, second) => {
    if (typeof first === "string") {
      writeLog("error", first, {
        ...(typeof second === "object" ? second : {}),
        severity: "fatal",
      });
      return;
    }

    writeLog("error", { ...first, severity: "fatal" }, second);
  },
};
