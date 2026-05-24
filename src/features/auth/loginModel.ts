import type { LoginRequest, LoginResponse } from "../../shared/types/domain";
import { getUserFacingErrorMessage, isAppError } from "../../shared/utils/appError";
import { hashPassword } from "./hashPassword";

export type LoginFormValues = {
  loginId: string;
  password: string;
};

export type LoginFieldName = keyof LoginFormValues;
export type LoginFieldErrors = Partial<Record<LoginFieldName, string>>;

export const LOGIN_SUCCESS_REDIRECT_PATH = "/main";

export function createEmptyLoginFormValues(): LoginFormValues {
  return {
    loginId: "",
    password: "",
  };
}

export function validateLoginForm(values: LoginFormValues): LoginFieldErrors {
  const fieldErrors: LoginFieldErrors = {};

  if (!values.loginId.trim()) {
    fieldErrors.loginId = "Please enter your login ID.";
  }

  if (!values.password) {
    fieldErrors.password = "Please enter your password.";
  }

  return fieldErrors;
}

export function createLoginRequest(
  values: LoginFormValues,
  passwordHash: string,
): LoginRequest {
  return {
    loginId: values.loginId.trim(),
    passwordHash,
  };
}

export async function submitLogin({
  values,
  login,
  hashPasswordFn = hashPassword,
}: {
  values: LoginFormValues;
  login: (request: LoginRequest) => Promise<LoginResponse>;
  hashPasswordFn?: typeof hashPassword;
}) {
  const passwordHash = await hashPasswordFn(values.password);
  const response = await login(createLoginRequest(values, passwordHash));

  return {
    response,
    redirectTo: LOGIN_SUCCESS_REDIRECT_PATH,
  };
}

export function mapLoginError(error: unknown) {
  const message = getUserFacingErrorMessage(error);

  if (
    isAppError(error) &&
    (error.code === "AUTH_INVALID_CREDENTIALS" || error.code === "UNAUTHORIZED")
  ) {
    return {
      fieldErrors: {},
      formError: message,
    };
  }

  return {
    fieldErrors: {},
    formError: message,
  };
}
