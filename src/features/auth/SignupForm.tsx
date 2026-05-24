import { ChangeEvent, FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "./authApi";
import {
  createEmptySignupFormValues,
  getNicknameAvailabilityMessage,
  mapSignupError,
  submitSignup,
  validateSignupForm,
  type SignupFieldErrors,
  type SignupFieldName,
  type SignupFormValues,
} from "./signupModel";

type NicknameAvailabilityState =
  | {
      status: "idle";
      message: null;
      checkedNickname: null;
    }
  | {
      status: "checking" | "available" | "unavailable";
      message: string;
      checkedNickname: string;
    };

const INITIAL_FIELD_ERRORS: SignupFieldErrors = {};

export function SignupForm() {
  const navigate = useNavigate();
  const [values, setValues] = useState<SignupFormValues>(
    createEmptySignupFormValues,
  );
  const [fieldErrors, setFieldErrors] =
    useState<SignupFieldErrors>(INITIAL_FIELD_ERRORS);
  const [formError, setFormError] = useState<string | null>(null);
  const [nicknameAvailability, setNicknameAvailability] =
    useState<NicknameAvailabilityState>({
      status: "idle",
      message: null,
      checkedNickname: null,
    });

  const nicknameCheckMutation = useMutation({
    mutationFn: authApi.checkNicknameAvailability,
    onMutate(nickname) {
      const trimmedNickname = nickname.trim();

      setFormError(null);
      setFieldErrors((previousErrors) => ({
        ...previousErrors,
        nickname: undefined,
      }));
      setNicknameAvailability({
        status: "checking",
        message: "Checking nickname availability...",
        checkedNickname: trimmedNickname,
      });
    },
    onSuccess(result, nickname) {
      const trimmedNickname = nickname.trim();
      const availabilityMessage = getNicknameAvailabilityMessage(
        result.isAvailable,
      );

      setNicknameAvailability({
        status: result.isAvailable ? "available" : "unavailable",
        message: availabilityMessage,
        checkedNickname: trimmedNickname,
      });

      if (result.isAvailable) {
        setFieldErrors((previousErrors) => ({
          ...previousErrors,
          nickname: undefined,
        }));
        return;
      }

      setFieldErrors((previousErrors) => ({
        ...previousErrors,
        nickname: availabilityMessage,
      }));
    },
    onError(error, nickname) {
      const mappedError = mapSignupError(error);

      setNicknameAvailability({
        status: "idle",
        message: null,
        checkedNickname: null,
      });
      setFieldErrors((previousErrors) => ({
        ...previousErrors,
        ...mappedError.fieldErrors,
      }));
      setFormError(mappedError.formError);
    },
  });

  const signupMutation = useMutation({
    mutationFn: () =>
      submitSignup({
        values,
        signup: authApi.signup,
      }),
    onSuccess(result) {
      navigate(result.redirectTo, {
        replace: true,
      });
    },
    onError(error) {
      const mappedError = mapSignupError(error);

      setFieldErrors(mappedError.fieldErrors);
      setFormError(mappedError.formError);
    },
  });

  function setValue(fieldName: SignupFieldName, value: string) {
    setValues((previousValues) => ({
      ...previousValues,
      [fieldName]: value,
    }));
    setFieldErrors((previousErrors) => ({
      ...previousErrors,
      [fieldName]: undefined,
    }));
    setFormError(null);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.currentTarget;
    const fieldName = name as SignupFieldName;

    setValue(fieldName, value);

    if (fieldName === "nickname") {
      setNicknameAvailability({
        status: "idle",
        message: null,
        checkedNickname: null,
      });
    }
  }

  async function handleNicknameCheck() {
    const trimmedNickname = values.nickname.trim();

    if (!trimmedNickname) {
      setFieldErrors((previousErrors) => ({
        ...previousErrors,
        nickname: "Please enter a nickname before checking.",
      }));
      setNicknameAvailability({
        status: "idle",
        message: null,
        checkedNickname: null,
      });
      return;
    }

    try {
      await nicknameCheckMutation.mutateAsync(trimmedNickname);
    } catch {
      // React Query already routes the failure through onError for UI state updates.
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (nicknameIsPending) {
      setFormError("Wait for the nickname check to finish before signing up.");
      return;
    }

    const validationErrors = validateSignupForm(values);

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setFormError(null);
      return;
    }

    const trimmedNickname = values.nickname.trim();

    if (
      nicknameAvailability.status === "unavailable" &&
      nicknameAvailability.checkedNickname === trimmedNickname
    ) {
      setFieldErrors((previousErrors) => ({
        ...previousErrors,
        nickname: nicknameAvailability.message,
      }));
      setFormError(null);
      return;
    }

    setFieldErrors(INITIAL_FIELD_ERRORS);
    setFormError(null);
    try {
      await signupMutation.mutateAsync();
    } catch {
      // React Query already routes the failure through onError for UI state updates.
    }
  }

  const nicknameIsPending = nicknameCheckMutation.isPending;
  const signupIsPending = signupMutation.isPending;

  return (
    <div className="auth-card">
      <div className="auth-card__intro">
        <p className="auth-card__eyebrow">Authentication</p>
        <p className="auth-card__body">
          Create your account first, then continue through the login flow so the
          app can apply the shared auth storage rules consistently.
        </p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <label className="auth-field" htmlFor="signup-login-id">
          <span className="auth-field__label">Login ID</span>
          <input
            id="signup-login-id"
            name="loginId"
            type="text"
            autoComplete="username"
            className="auth-field__input"
            value={values.loginId}
            onChange={handleInputChange}
            aria-invalid={Boolean(fieldErrors.loginId)}
            aria-describedby={fieldErrors.loginId ? "signup-login-id-error" : undefined}
          />
          {fieldErrors.loginId ? (
            <span id="signup-login-id-error" className="auth-field__error">
              {fieldErrors.loginId}
            </span>
          ) : null}
        </label>

        <div className="auth-field">
          <div className="auth-field__split">
            <label className="auth-field__grow" htmlFor="signup-nickname">
              <span className="auth-field__label">Nickname</span>
              <input
                id="signup-nickname"
                name="nickname"
                type="text"
                autoComplete="nickname"
                className="auth-field__input"
                value={values.nickname}
                onChange={handleInputChange}
                aria-invalid={Boolean(fieldErrors.nickname)}
                aria-describedby={
                  fieldErrors.nickname ? "signup-nickname-error" : "signup-nickname-status"
                }
              />
            </label>
            <button
              type="button"
              className="auth-inline-button"
              onClick={handleNicknameCheck}
              disabled={nicknameIsPending || signupIsPending}
            >
              {nicknameIsPending ? "Checking..." : "Check nickname"}
            </button>
          </div>

          {fieldErrors.nickname ? (
            <span id="signup-nickname-error" className="auth-field__error">
              {fieldErrors.nickname}
            </span>
          ) : null}

          {nicknameAvailability.message ? (
            <span
              id="signup-nickname-status"
              className={`auth-field__status auth-field__status--${nicknameAvailability.status}`}
              aria-live="polite"
            >
              {nicknameAvailability.message}
            </span>
          ) : null}
        </div>

        <label className="auth-field" htmlFor="signup-email">
          <span className="auth-field__label">Email (optional)</span>
          <input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            className="auth-field__input"
            value={values.email}
            onChange={handleInputChange}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "signup-email-error" : undefined}
          />
          {fieldErrors.email ? (
            <span id="signup-email-error" className="auth-field__error">
              {fieldErrors.email}
            </span>
          ) : null}
        </label>

        <label className="auth-field" htmlFor="signup-password">
          <span className="auth-field__label">Password</span>
          <input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            className="auth-field__input"
            value={values.password}
            onChange={handleInputChange}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? "signup-password-error" : undefined}
          />
          {fieldErrors.password ? (
            <span id="signup-password-error" className="auth-field__error">
              {fieldErrors.password}
            </span>
          ) : null}
        </label>

        {formError ? (
          <div className="auth-form__error" role="alert">
            {formError}
          </div>
        ) : null}

        <button
          type="submit"
          className="auth-submit-button"
          disabled={signupIsPending || nicknameIsPending}
        >
          {signupIsPending ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="auth-card__footer">
        Already have an account? <Link to="/login">Go to login</Link>
      </p>
    </div>
  );
}
