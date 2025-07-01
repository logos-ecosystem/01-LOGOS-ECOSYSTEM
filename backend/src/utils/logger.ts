import winston from 'winston';
import path from 'path';
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Initialize Sentry
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      new ProfilingIntegration(),
    ],
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    beforeSend(event, hint) {
      // Filter out sensitive data
      if (event.request?.data) {
        const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard'];
        sensitiveFields.forEach(field => {
          if (event.request.data[field]) {
            event.request.data[field] = '[REDACTED]';
          }
        });
      }
      return event;
    },
  });
}

// Custom format for console logging
const consoleFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let msg = `${timestamp} [${level}] ${message}`;
  
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  
  if (stack) {
    msg += `\n${stack}`;
  }
  
  return msg;
});

// Custom format for file logging
const fileFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  const log: any = {
    timestamp,
    level,
    message,
    ...metadata
  };
  
  if (stack) {
    log.stack = stack;
  }
  
  return JSON.stringify(log);
});

// Sentry transport for errors
class SentryTransport extends winston.transports.Stream {
  _write(info: any, encoding: string, callback: () => void) {
    const { level, message, ...meta } = info;

    if (level === 'error') {
      Sentry.captureException(new Error(message), {
        extra: meta,
      });
    } else {
      Sentry.captureMessage(message, level as Sentry.SeverityLevel);
    }

    callback();
  }
}

// Define transports
const transports: winston.transport[] = [];

// Console transport (except in test environment)
if (process.env.NODE_ENV !== 'test') {
  transports.push(
    new winston.transports.Console({
      format: combine(
        colorize(),
        consoleFormat
      )
    })
  );
}

// File transports
transports.push(
  // Error log file
  new winston.transports.File({
    filename: path.join('logs', 'error.log'),
    level: 'error',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }),
  // Combined log file
  new winston.transports.File({
    filename: path.join('logs', 'combined.log'),
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  })
);

// Add Sentry transport if configured
if (process.env.SENTRY_DSN) {
  transports.push(new SentryTransport({ 
    stream: new (require('stream').Writable)({
      write(chunk: any, encoding: string, callback: () => void) {
        callback();
      }
    }),
    level: 'error' 
  }));
}

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
  ),
  transports,
  exitOnError: false
});

// Add request logging middleware
export const requestLogger = winston.createLogger({
  level: 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    fileFormat
  ),
  transports: [
    new winston.transports.File({
      filename: path.join('logs', 'requests.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Create a stream object for Morgan middleware
export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

// Helper functions
export const logError = (error: Error, context?: any) => {
  logger.error({
    message: error.message,
    stack: error.stack,
    ...context
  });
  
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, { extra: context });
  }
};

export const logInfo = (message: string, context?: any) => {
  logger.info({
    message,
    ...context
  });
};

export const logWarning = (message: string, context?: any) => {
  logger.warn({
    message,
    ...context
  });
};

export const logDebug = (message: string, context?: any) => {
  logger.debug({
    message,
    ...context
  });
};

export const logApiCall = (method: string, path: string, statusCode: number, duration: number, userId?: string) => {
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
  
  logger.log(level, 'API Call', {
    method,
    path,
    statusCode,
    duration,
    userId,
  });
};

export const logDatabaseQuery = (query: string, duration: number, params?: any) => {
  logger.debug('Database Query', {
    query,
    duration,
    params: process.env.NODE_ENV === 'development' ? params : undefined,
  });
};

export const logPerformance = (operation: string, duration: number, metadata?: any) => {
  const level = duration > 5000 ? 'warn' : 'info';
  
  logger.log(level, `Performance: ${operation}`, {
    duration,
    ...metadata,
  });
};

export const startTimer = () => {
  return process.hrtime();
};

export const endTimer = (start: [number, number]): number => {
  const diff = process.hrtime(start);
  return Math.round((diff[0] * 1e9 + diff[1]) / 1e6); // Convert to milliseconds
};