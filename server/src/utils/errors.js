export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Invalid credentials') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class TenantNotFoundError extends AppError {
  constructor(message = 'Tenant not found') {
    super(message, 404, 'TENANT_NOT_FOUND');
  }
}

export class DatabaseUnavailableError extends AppError {
  constructor(message = 'Database unavailable') {
    super(message, 503, 'DATABASE_UNAVAILABLE');
  }
}

export class PoolCreationError extends AppError {
  constructor(message = 'Failed to create database pool') {
    super(message, 503, 'POOL_CREATION_FAILED');
  }
}
