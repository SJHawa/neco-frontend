import { ChangeEvent, FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
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
    <section className="signup-form-panel">
      <div className="signup-form-panel__header">
        <h2>계정을 생성하세요</h2>
      </div>

      <form className="signup-form" onSubmit={handleSubmit} noValidate>
        <label className="signup-field" htmlFor="signup-login-id">
          <span className="signup-field__label">아이디</span>
          <input
            id="signup-login-id"
            name="loginId"
            type="text"
            autoComplete="username"
            className="signup-field__input"
            value={values.loginId}
            onChange={handleInputChange}
            aria-invalid={Boolean(fieldErrors.loginId)}
            aria-describedby={fieldErrors.loginId ? "signup-login-id-error" : undefined}
          />
          {fieldErrors.loginId ? (
            <span id="signup-login-id-error" className="signup-field__error">
              {fieldErrors.loginId}
            </span>
          ) : null}
        </label>

        <label className="signup-field" htmlFor="signup-password">
          <span className="signup-field__label">비밀번호</span>
          <input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            className="signup-field__input"
            value={values.password}
            onChange={handleInputChange}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? "signup-password-error" : undefined}
          />
          {fieldErrors.password ? (
            <span id="signup-password-error" className="signup-field__error">
              {fieldErrors.password}
            </span>
          ) : null}
        </label>

        <label className="signup-field" htmlFor="signup-password-confirmation">
          <span className="signup-field__label">비밀번호 확인</span>
          <input
            id="signup-password-confirmation"
            name="passwordConfirmation"
            type="password"
            autoComplete="new-password"
            className="signup-field__input"
            value={values.passwordConfirmation}
            onChange={handleInputChange}
            aria-invalid={Boolean(fieldErrors.passwordConfirmation)}
            aria-describedby={
              fieldErrors.passwordConfirmation
                ? "signup-password-confirmation-error"
                : undefined
            }
          />
          {fieldErrors.passwordConfirmation ? (
            <span
              id="signup-password-confirmation-error"
              className="signup-field__error"
            >
              {fieldErrors.passwordConfirmation}
            </span>
          ) : null}
        </label>

        <div className="signup-field">
          <div className="signup-field__row">
            <label className="signup-field__grow" htmlFor="signup-nickname">
              <span className="signup-field__label">닉네임</span>
              <input
                id="signup-nickname"
                name="nickname"
                type="text"
                autoComplete="nickname"
                className="signup-field__input"
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
              className="signup-field__check-button"
              onClick={handleNicknameCheck}
              disabled={nicknameIsPending || signupIsPending}
            >
              {nicknameIsPending ? "확인중" : "중복확인"}
            </button>
          </div>

          {fieldErrors.nickname ? (
            <span id="signup-nickname-error" className="signup-field__error">
              {fieldErrors.nickname}
            </span>
          ) : null}

          {nicknameAvailability.message ? (
            <span
              id="signup-nickname-status"
              className={`signup-field__status signup-field__status--${nicknameAvailability.status}`}
              aria-live="polite"
            >
              {nicknameAvailability.message}
            </span>
          ) : null}
        </div>

        <label className="signup-field" htmlFor="signup-email">
          <span className="signup-field__label">이메일</span>
          <input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            className="signup-field__input"
            value={values.email}
            onChange={handleInputChange}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "signup-email-error" : undefined}
          />
          {fieldErrors.email ? (
            <span id="signup-email-error" className="signup-field__error">
              {fieldErrors.email}
            </span>
          ) : null}
        </label>

        {formError ? (
          <div className="signup-form__error" role="alert">
            {formError}
          </div>
        ) : null}

        <button
          type="submit"
          className="signup-form__submit"
          disabled={signupIsPending || nicknameIsPending}
        >
          {signupIsPending ? "가입 중..." : "가입하기"}
        </button>
      </form>
    </section>
  );
}
