import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";
import { useAppStore } from "../providers/ClientStateProvider";
import { LoginPage } from "../../pages/LoginPage";
import { SignupPage } from "../../pages/SignupPage";
import { MainPage } from "../../pages/MainPage";
import { RoomPage } from "../../pages/RoomPage";
import { ResultPage } from "../../pages/ResultPage";
import { NotFoundPage } from "../../pages/NotFoundPage";
import {
  getGuestRouteRedirectPath,
  getProtectedRouteRedirectPath,
  getRootRedirectPath,
} from "./authRouting";

function RootRedirect() {
  const isAuthenticated = useAppStore((state) => state.auth.isAuthenticated);

  return <Navigate to={getRootRedirectPath(isAuthenticated)} replace />;
}

function GuestOnlyRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppStore((state) => state.auth.isAuthenticated);
  const redirectPath = getGuestRouteRedirectPath(isAuthenticated);

  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppStore((state) => state.auth.isAuthenticated);
  const redirectPath = getProtectedRouteRedirectPath(isAuthenticated);

  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootRedirect />,
  },
  {
    path: "/login",
    element: (
      <GuestOnlyRoute>
        <LoginPage />
      </GuestOnlyRoute>
    ),
  },
  {
    path: "/signup",
    element: (
      <GuestOnlyRoute>
        <SignupPage />
      </GuestOnlyRoute>
    ),
  },
  {
    path: "/main",
    element: (
      <ProtectedRoute>
        <MainPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/rooms/:gameRoomId/play",
    element: (
      <ProtectedRoute>
        <RoomPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/rooms/:gameRoomId/result",
    element: (
      <ProtectedRoute>
        <ResultPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
