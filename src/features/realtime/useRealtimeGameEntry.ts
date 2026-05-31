import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { setRealtimeNavigateHandler } from "./realtimeNavigation";

export function useRealtimeGameEntry() {
  const navigate = useNavigate();

  useEffect(() => {
    setRealtimeNavigateHandler((path) => {
      navigate(path, { replace: true });
    });

    return () => {
      setRealtimeNavigateHandler(null);
    };
  }, [navigate]);
}
