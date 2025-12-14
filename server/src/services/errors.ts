export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class RateLimitError extends ApiError {
  constructor(message: string = 'API rate limit exceeded') {
    super(429, message);
    this.name = 'RateLimitError';
  }
}

export class InvalidDomainError extends ApiError {
  constructor(domain: string) {
    super(400, `Invalid domain: ${domain}`);
    this.name = 'InvalidDomainError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string) {
    super(404, message);
    this.name = 'NotFoundError';
  }
}

export class NetworkError extends ApiError {
  constructor(message: string = 'Network error occurred') {
    super(502, message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends ApiError {
  constructor(message: string = 'Request timed out') {
    super(504, message);
    this.name = 'TimeoutError';
  }
}
