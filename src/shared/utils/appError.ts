import { errorMessageMap } from "../constants/errorMessages";

const DEFAULT_ERROR_MESSAGE = "An unexpected error occurred.";

export type AppErrorOptions = {
  code: string;
  message: string;
  status?: number;
  requestId?: string;
  cause?: unknown;
};

export class AppError extends Error {
  code: string;
  status?: number;
  requestId?: string;

  constructor({ code, message, status, requestId, cause }: AppErrorOptions) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.requestId = requestId;

    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function getErrorMessageForCode(code: string) {
  return errorMessageMap[code];
}

export function getUserFacingErrorMessage(
  error: unknown,
  fallbackMessage = DEFAULT_ERROR_MESSAGE,
) {
  if (typeof error === "string") {
    return getErrorMessageForCode(error) ?? error;
  }

  if (isAppError(error)) {
    return getErrorMessageForCode(error.code) ?? error.message ?? fallbackMessage;
  }

  if (error instanceof Error) {
    return error.message || fallbackMessage;
  }

  return fallbackMessage;
}
