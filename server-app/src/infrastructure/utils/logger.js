import path from "path";

import { WinstonTransport as AxiomTransport } from "@axiomhq/winston";
import winston from "winston";

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define level based on environment
const level = () => {
  const env = process.env.NODE_ENV || "development";
  return env === "development" ? "debug" : "info";
};

// Define custom colors
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "blue",
};

// Add colors to winston
winston.addColors(colors);

// Shared by every transport. `errors({ stack: true })` is what makes the
// `logger.error(msg, { error })` calls throughout the codebase actually carry
// a stack — without it the error object is dropped on the floor.
const baseFormat = winston.format.combine(
  winston.format.errors({ stack: true }),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
);

// Colour belongs to the terminal. Applied at logger level it also wrote ANSI
// escape sequences into the log files and the Axiom payload.
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Structured, so metadata and stacks survive to disk and to Axiom.
const structuredFormat = winston.format.json();

// Define transports for the logs
const transports = [
  // Console transport for all logs
  new winston.transports.Console({ format: consoleFormat }),

  // File transport for errors
  new winston.transports.File({
    filename: path.join("logs", "error.log"),
    level: "error",
    format: structuredFormat,
  }),

  // File transport for all logs
  new winston.transports.File({
    filename: path.join("logs", "combined.log"),
    format: structuredFormat,
  }),
];

if (process.env.AXIOM_TOKEN && process.env.AXIOM_DATASET) {
  transports.push(
    new AxiomTransport({
      token: process.env.AXIOM_TOKEN,
      dataset: process.env.AXIOM_DATASET,
      format: structuredFormat,
    }),
  );
}

// Create the Winston logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format: baseFormat,
  transports,
});

export default logger;
