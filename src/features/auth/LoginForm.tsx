import { ChangeEvent, FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useAppStoreApi } from "../../app/providers/ClientStateProvider";
import { authApi } from "./authApi";
import { createAuthenticatedAuthState, persistLoginSession } from "./authSession";
import {
  createEmptyLoginFormValues,
  mapLoginError,
  submitLogin,
  validateLoginForm,
  type LoginFieldErrors,
  type LoginFieldName,
  type LoginFormValues,
} from "./loginModel";
import "./loginForm.css";

const INITIAL_FIELD_ERRORS: LoginFieldErrors = {};

export function LoginForm() {
  const navigate = useNavigate();
  const store = useAppStoreApi();
  const [values, setValues] = useState<LoginFormValues>(createEmptyLoginFormValues);
  const [fieldErrors, setFieldErrors] =
    useState<LoginFieldErrors>(INITIAL_FIELD_ERRORS);
  const [formError, setFormError] = useState<string | null>(null);

  const loginMutation = useMutation({
    mutationFn: () =>
      submitLogin({
        values,
        login: authApi.login,
      }),
    onSuccess(result) {
      persistLoginSession(result.response);
      store.setState((state) => ({
        ...state,
        auth: createAuthenticatedAuthState({
          accessToken: result.response.accessToken,
          refreshToken: result.response.refreshToken,
          user: result.response.user,
        }),
      }));

      navigate(result.redirectTo, {
        replace: true,
      });
    },
    onError(error) {
      const mappedError = mapLoginError(error);
      setFieldErrors(mappedError.fieldErrors);
      setFormError(mappedError.formError);
    },
  });

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.currentTarget;
    const fieldName = name as LoginFieldName;

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validateLoginForm(values);

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setFormError(null);
      return;
    }

    setFieldErrors(INITIAL_FIELD_ERRORS);
    setFormError(null);

    try {
      await loginMutation.mutateAsync();
    } catch {
      // React Query already routes the failure through onError for UI state updates.
    }
  }

  const loginIsPending = loginMutation.isPending;

  return (
    <section className="login-panel">
      <header className="login-panel__header">
        <p className="login-panel__eyebrow">Authentication</p>
        <h1>로그인</h1>
        <p className="login-panel__description">
          로그인 후 `/main`으로 이동하고, 인증 토큰과 사용자 상태를 현재 세션에
          맞게 복원합니다.
        </p>
      </header>

      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <label className="login-field" htmlFor="login-login-id">
          <span className="login-field__label">아이디</span>
          <input
            id="login-login-id"
            name="loginId"
            type="text"
            autoComplete="username"
            className="login-field__input"
            value={values.loginId}
            onChange={handleInputChange}
            aria-invalid={Boolean(fieldErrors.loginId)}
            aria-describedby={fieldErrors.loginId ? "login-login-id-error" : undefined}
          />
          {fieldErrors.loginId ? (
            <span id="login-login-id-error" className="login-field__error">
              {fieldErrors.loginId}
            </span>
          ) : null}
        </label>

        <label className="login-field" htmlFor="login-password">
          <span className="login-field__label">비밀번호</span>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            className="login-field__input"
            value={values.password}
            onChange={handleInputChange}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
          />
          {fieldErrors.password ? (
            <span id="login-password-error" className="login-field__error">
              {fieldErrors.password}
            </span>
          ) : null}
        </label>

        {formError ? (
          <div className="login-form__error" role="alert">
            {formError}
          </div>
        ) : null}

        <button
          type="submit"
          className="login-form__submit"
          disabled={loginIsPending}
        >
          {loginIsPending ? "로그인 중..." : "로그인"}
        </button>
      </form>

      <p className="login-panel__footer">
        계정이 없으신가요? <Link to="/signup">회원가입</Link>
      </p>
    </section>
  );
}
