import { Link } from "react-router-dom";
import { LoginForm } from "../../features/auth/LoginForm";
import { SignupMascotIllustration } from "../../shared/components/SignupMascotIllustration";

export function LoginPage() {
  return (
    <main className="signup-screen">
      <div className="signup-screen__frame">
        <header className="signup-screen__topbar">
          <Link to="/" className="signup-screen__logo">
            네코내코<span className="signup-screen__logo-paw">🐾</span>
          </Link>

          <div className="signup-screen__topbar-actions">
            <nav className="signup-screen__auth-links" aria-label="Authentication">
              <span aria-current="page">Login</span>
              <span>/</span>
              <Link to="/signup">Sign Up</Link>
            </nav>
          </div>
        </header>

        <div className="signup-screen__workspace">
          <div className="signup-modal signup-modal--login">
            <Link
              to="/signup"
              className="signup-modal__close"
              aria-label="Close login dialog"
            >
              ×
            </Link>

            <div className="login-modal__form-side">
              <LoginForm />
            </div>

            <div className="signup-modal__intro signup-modal__intro--login">
              <div className="signup-modal__mascot-scene" aria-hidden="true">
                <SignupMascotIllustration />
              </div>

              <div>
                <h1>반갑습니다!</h1>
                <p>
                  계정에 로그인하고
                  <br />
                  친구들과 코딩 릴레이를 시작해보세요!
                </p>
              </div>

              <p className="signup-modal__login-hint">
                계정이 없으신가요? <Link to="/signup">회원가입</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
