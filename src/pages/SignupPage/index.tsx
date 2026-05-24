import { Navigate } from "react-router-dom";
import { useAppStore } from "../../app/providers/ClientStateProvider";
import { PageShell } from "../../shared/components/PageShell";
import { SignupForm } from "../../features/auth/SignupForm";

export function SignupPage() {
  const isAuthenticated = useAppStore((state) => state.auth.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/main" replace />;
  }

  return (
    <PageShell
      title="Signup"
      description="Create your account, confirm nickname availability, and continue to login."
    >
      <SignupForm />
    </PageShell>
  );
}
