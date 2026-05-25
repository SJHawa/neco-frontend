import { PropsWithChildren, createContext, useContext, useEffect, useRef } from "react";
import { useStore } from "zustand";
import { AUTH_LOGOUT_EVENT, AUTH_SESSION_SYNC_EVENT } from "../../shared/constants/auth";
import type { RootClientState } from "../../shared/types/clientState";
import { getHydratedAuthState } from "../../features/auth/authSession";
import { AppStore, createAppStore, resetAppStoreForLogout } from "../store/clientState";

const AppStoreContext = createContext<AppStore | null>(null);

export function useAppStore<T>(selector: (state: RootClientState) => T) {
  const store = useContext(AppStoreContext);

  if (!store) {
    throw new Error("useAppStore must be used within ClientStateProvider");
  }

  return useStore(store, selector);
}

export function useAppStoreApi() {
  const store = useContext(AppStoreContext);

  if (!store) {
    throw new Error("useAppStoreApi must be used within ClientStateProvider");
  }

  return store;
}

export function ClientStateProvider({ children }: PropsWithChildren) {
  const storeRef = useRef<AppStore | null>(null);

  if (!storeRef.current) {
    storeRef.current = createAppStore();
  }

  useEffect(() => {
    const store = storeRef.current;

    if (!store || typeof window === "undefined") {
      return;
    }

    const activeStore = store;

    function handleAuthSessionSync() {
      activeStore.setState((state) => ({
        ...state,
        auth: getHydratedAuthState(state.auth.user),
      }));
    }

    function handleAuthLogout() {
      resetAppStoreForLogout(activeStore);
    }

    window.addEventListener(AUTH_SESSION_SYNC_EVENT, handleAuthSessionSync);
    window.addEventListener(AUTH_LOGOUT_EVENT, handleAuthLogout);

    return () => {
      window.removeEventListener(AUTH_SESSION_SYNC_EVENT, handleAuthSessionSync);
      window.removeEventListener(AUTH_LOGOUT_EVENT, handleAuthLogout);
    };
  }, []);

  return (
    <AppStoreContext.Provider value={storeRef.current}>
      {children}
    </AppStoreContext.Provider>
  );
}
