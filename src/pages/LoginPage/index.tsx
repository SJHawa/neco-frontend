import { PageShell } from "../../shared/components/PageShell";
import { LoginForm } from "../../features/auth/LoginForm";

export function LoginPage() {
  return (
    <PageShell
      title="Login"
      description="로그인 후 `/main`으로 이동하고 보호된 라우트에 접근할 수 있습니다."
    >
      <LoginForm />
    </PageShell>
  );
}
