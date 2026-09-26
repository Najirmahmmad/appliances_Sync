import poolManager from '../database/PoolManager.js';
import { AppError } from '../utils/errors.js';

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const code = err.code || 'INTERNAL_ERROR';

  if (!(err instanceof AppError)) {
    console.error(err.stack || err);
  }

  res.status(statusCode).json({
    status: 'error',
    code,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
