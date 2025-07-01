import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error
  logger.error({
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    user: req.user?.id
  });

  // Default error
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let error = 'ServerError';

  // Handle specific errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    error = 'ValidationError';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    error = 'UnauthorizedError';
    message = 'Unauthorized access';
  } else if (err.code === 'P2002') {
    // Prisma unique constraint error
    statusCode = 409;
    error = 'ConflictError';
    message = 'Resource already exists';
  } else if (err.code === 'P2025') {
    // Prisma not found error
    statusCode = 404;
    error = 'NotFoundError';
    message = 'Resource not found';
  }

  // Send response
  res.status(statusCode).json({
    error,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      details: err.details,
      stack: err.stack
    })
  });
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};