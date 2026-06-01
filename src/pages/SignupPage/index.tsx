import { Link, Navigate } from "react-router-dom";
import { useAppStore } from "../../app/providers/ClientStateProvider";
import { SignupForm } from "../../features/auth/SignupForm";
import { SignupMascotIllustration } from "../../shared/components/SignupMascotIllustration";

export function SignupPage() {
  const isAuthenticated = useAppStore((state) => state.auth.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/main" replace />;
  }

  return (
    <main className="signup-screen">
      <div className="signup-screen__frame">
        <header className="signup-screen__topbar">
          <Link to="/" className="signup-screen__logo">
            네코내코<span className="signup-screen__logo-paw">🐾</span>
          </Link>

          <div className="signup-screen__topbar-actions">
            <nav className="signup-screen__auth-links" aria-label="Authentication">
              <Link to="/login">Login</Link>
              <span>/</span>
              <span aria-current="page">Sign Up</span>
            </nav>
          </div>
        </header>

        <div className="signup-screen__workspace">
          <div className="signup-modal">
            <Link
              to="/login"
              className="signup-modal__close"
              aria-label="Close signup dialog"
            >
              ×
            </Link>

            <div className="signup-modal__intro">
              <div>
                <h1>가입하기</h1>
                <p>
                  계정을 만들고
                  <br />
                  친구들과 플레이해보세요!
                </p>
              </div>

              <div className="signup-modal__mascot-scene" aria-hidden="true">
                <SignupMascotIllustration />
              </div>

              <p className="signup-modal__login-hint">
                계정이 이미 있으신가요? <Link to="/login">로그인</Link>
              </p>
            </div>

            <SignupForm />
          </div>
        </div>
      </div>
    </main>
  );
}
