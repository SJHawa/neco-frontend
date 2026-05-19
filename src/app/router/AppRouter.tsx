import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";
import { useAppStore } from "../providers/ClientStateProvider";
import { LoginPage } from "../../pages/LoginPage";
import { SignupPage } from "../../pages/SignupPage";
import { MainPage } from "../../pages/MainPage";
import { RoomPage } from "../../pages/RoomPage";
import { ResultPage } from "../../pages/ResultPage";
import { NotFoundPage } from "../../pages/NotFoundPage";

function RootRedirect() {
  const isAuthenticated = useAppStore((state) => state.auth.isAuthenticated);

  return <Navigate to={isAuthenticated ? "/main" : "/login"} replace />;
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootRedirect />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/signup",
    element: <SignupPage />,
  },
  {
    path: "/main",
    element: <MainPage />,
  },
  {
    path: "/rooms/:gameRoomId/play",
    element: <RoomPage />,
  },
  {
    path: "/rooms/:gameRoomId/result",
    element: <ResultPage />,
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
