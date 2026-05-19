import { PropsWithChildren, createContext, useContext, useRef } from "react";
import { useStore } from "zustand";
import { AppStore, RootClientState, createAppStore } from "../store/clientState";

const AppStoreContext = createContext<AppStore | null>(null);

export function ClientStateProvider({ children }: PropsWithChildren) {
  const storeRef = useRef<AppStore | null>(null);

  if (!storeRef.current) {
    storeRef.current = createAppStore();
  }

  return (
    <AppStoreContext.Provider value={storeRef.current}>
      {children}
    </AppStoreContext.Provider>
  );
}

export function useAppStore<T>(selector: (state: RootClientState) => T) {
  const store = useContext(AppStoreContext);

  if (!store) {
    throw new Error("useAppStore must be used within ClientStateProvider");
  }

  return useStore(store, selector);
}
