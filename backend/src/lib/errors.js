// A simple error type that carries an HTTP status + machine-readable code.
// Throw one of these anywhere and the central error handler turns it into JSON.
export class AppError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const badRequest = (msg, code = "BAD_REQUEST") => new AppError(400, code, msg);
export const unauthorized = (msg = "Unauthorized", code = "UNAUTHORIZED") => new AppError(401, code, msg);
export const forbidden = (msg = "Forbidden", code = "FORBIDDEN") => new AppError(403, code, msg);
export const notFound = (msg = "Not found", code = "NOT_FOUND") => new AppError(404, code, msg);
export const conflict = (msg, code = "CONFLICT") => new AppError(409, code, msg);
export const tooMany = (msg = "Too many requests", code = "RATE_LIMITED") => new AppError(429, code, msg);
export const badGateway = (msg = "Upstream service error", code = "UPSTREAM") => new AppError(502, code, msg);
