import { NextResponse } from "next/server";

export type ApiErrorBody = {
  code: string;
  message: string;
  recoverable: boolean;
  details?: Record<string, unknown>;
};

export class ServiceError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly recoverable: boolean,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export function validationError(
  message: string,
  details?: Record<string, unknown>,
): ServiceError {
  return new ServiceError("VALIDATION_ERROR", message, 400, true, details);
}

export function notFoundError(message: string): ServiceError {
  return new ServiceError("NOT_FOUND", message, 404, false);
}

export function conflictError(message: string): ServiceError {
  return new ServiceError("CONFLICT", message, 409, false);
}

export function routeError(error: unknown) {
  const serviceError =
    error instanceof ServiceError
      ? error
      : new ServiceError("INTERNAL_ERROR", "Unexpected server error", 500, true);

  const body: ApiErrorBody = {
    code: serviceError.code,
    message: serviceError.message,
    recoverable: serviceError.recoverable,
    ...(serviceError.details ? { details: serviceError.details } : {}),
  };

  return NextResponse.json(body, { status: serviceError.status });
}
