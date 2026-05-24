import type { SignupRequest, SignupResponse } from "../../shared/types/domain";
import {
  getErrorMessageForCode,
  getUserFacingErrorMessage,
  isAppError,
} from "../../shared/utils/appError";
import { hashPassword } from "./hashPassword";

export type SignupFormValues = {
  loginId: string;
  nickname: string;
  email: string;
  password: string;
};

export type SignupFieldName = "loginId" | "nickname" | "email" | "password";

export type SignupFieldErrors = Partial<Record<SignupFieldName, string>>;

export const SIGNUP_SUCCESS_REDIRECT_PATH = "/login";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function createEmptySignupFormValues(): SignupFormValues {
  return {
    loginId: "",
    nickname: "",
    email: "",
    password: "",
  };
}

function normalizeOptionalEmail(email: string) {
  const trimmedEmail = email.trim();

  return trimmedEmail.length > 0 ? trimmedEmail : null;
}

export function validateSignupForm(
  values: SignupFormValues,
): SignupFieldErrors {
  const fieldErrors: SignupFieldErrors = {};

  if (!values.loginId.trim()) {
    fieldErrors.loginId = "Please enter a login ID.";
  }

  if (!values.nickname.trim()) {
    fieldErrors.nickname = "Please enter a nickname.";
  }

  if (!values.password) {
    fieldErrors.password = "Please enter a password.";
  }

  const normalizedEmail = normalizeOptionalEmail(values.email);

  if (normalizedEmail && !EMAIL_PATTERN.test(normalizedEmail)) {
    fieldErrors.email = "Please enter a valid email address.";
  }

  return fieldErrors;
}

export function createSignupRequest(
  values: SignupFormValues,
  passwordHash: string,
): SignupRequest {
  return {
    loginId: values.loginId.trim(),
    nickname: values.nickname.trim(),
    passwordHash,
    email: normalizeOptionalEmail(values.email),
  };
}

type SignupSubmitDependencies = {
  values: SignupFormValues;
  signup: (request: SignupRequest) => Promise<SignupResponse>;
  hashPasswordFn?: typeof hashPassword;
};

export async function submitSignup({
  values,
  signup,
  hashPasswordFn = hashPassword,
}: SignupSubmitDependencies) {
  const passwordHash = await hashPasswordFn(values.password);
  const response = await signup(createSignupRequest(values, passwordHash));

  return {
    response,
    redirectTo: SIGNUP_SUCCESS_REDIRECT_PATH,
  };
}

export function mapSignupError(error: unknown) {
  const message = getUserFacingErrorMessage(error);

  if (!isAppError(error)) {
    return {
      fieldErrors: {},
      formError: message,
    };
  }

  if (error.code === "AUTH_LOGIN_ID_CONFLICT") {
    return {
      fieldErrors: {
        loginId: message,
      },
      formError: null,
    };
  }

  if (error.code === "AUTH_NICKNAME_CONFLICT") {
    return {
      fieldErrors: {
        nickname: message,
      },
      formError: null,
    };
  }

  if (error.code === "AUTH_EMAIL_CONFLICT") {
    return {
      fieldErrors: {
        email: message,
      },
      formError: null,
    };
  }

  return {
    fieldErrors: {},
    formError: message,
  };
}

export function getNicknameAvailabilityMessage(isAvailable: boolean) {
  if (isAvailable) {
    return "This nickname is available.";
  }

  return (
    getErrorMessageForCode("AUTH_NICKNAME_CONFLICT") ??
    "This nickname is already in use."
  );
}
