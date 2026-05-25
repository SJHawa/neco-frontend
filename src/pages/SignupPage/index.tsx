import { Link, Navigate } from "react-router-dom";
import { useAppStore } from "../../app/providers/ClientStateProvider";
import { SignupForm } from "../../features/auth/SignupForm";
import { SignupMascotIllustration } from "../../shared/components/SignupMascotIllustration";

function HeaderIcon({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="signup-screen__icon-button"
      aria-label={label}
      disabled
    >
      {children}
    </button>
  );
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 12a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Zm-7 8.25c0-3.32 3.13-6 7-6s7 2.68 7 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 4.25a4.5 4.5 0 0 0-4.5 4.5v2.1c0 .88-.28 1.74-.8 2.45l-1.08 1.47c-.49.67-.01 1.63.82 1.63h11.12c.83 0 1.31-.96.82-1.63l-1.08-1.47a4.17 4.17 0 0 1-.8-2.45v-2.1a4.5 4.5 0 0 0-4.5-4.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.75 18.4a2.25 2.25 0 0 0 4.5 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 8.75a3.25 3.25 0 1 0 0 6.5 3.25 3.25 0 0 0 0-6.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="m19.1 13.35.9-1.35-.9-1.35-1.8-.36a5.65 5.65 0 0 0-.63-1.51l1.04-1.5-.64-1.1-1.82.28a5.93 5.93 0 0 0-1.33-.88L12.9 3h-1.8l-.99 1.58c-.47.19-.92.47-1.33.82l-1.82-.22-.64 1.1 1.04 1.5c-.28.47-.5.98-.64 1.53L4.9 10.65 4 12l.9 1.35 1.82.36c.14.55.36 1.06.64 1.53l-1.04 1.5.64 1.1 1.82-.22c.41.35.86.63 1.33.82L11.1 21h1.8l.99-1.58c.47-.19.92-.47 1.33-.82l1.82.22.64-1.1-1.04-1.5c.28-.47.49-.98.63-1.53l1.82-.36Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
            <div className="signup-screen__icon-group">
              <HeaderIcon label="Profile">
                <PersonIcon />
              </HeaderIcon>
              <HeaderIcon label="Notifications">
                <BellIcon />
              </HeaderIcon>
              <HeaderIcon label="Settings">
                <GearIcon />
              </HeaderIcon>
            </div>

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
