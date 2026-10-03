"use client";

import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  FavoritesRepository,
  RecentRepository,
  type RecentEntry,
} from "@/lib/storage";

interface LibraryState {
  favorites: string[];
  recent: RecentEntry[];
}
interface LibraryContext extends LibraryState {
  loaded: boolean;
  toggle: (id: string) => void;
  played: (id: string) => void;
  clearRecent: () => void;
}
const Context = createContext<LibraryContext>({
  favorites: [],
  recent: [],
  loaded: false,
  toggle: () => {},
  played: () => {},
  clearRecent: () => {},
});

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [library, setLibrary] = useState<LibraryState>({
    favorites: [],
    recent: [],
  });
  const [loaded, setLoaded] = useState(false);
  // Keep callbacks synchronous without writes inside React state updaters,
  // which React may replay in development.
  const current = useRef(library);
  useEffect(() => {
    const sync = () => {
      const next = {
        favorites: FavoritesRepository.read(),
        recent: RecentRepository.read(),
      };
      current.current = next;
      setLibrary(next);
      setLoaded(true);
    };
    const onStorage = (event: StorageEvent) => {
      if (
        event.key === null ||
        event.key === "app:favorites" ||
        event.key === "app:recent"
      )
        sync();
    };
    sync();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const toggle = useCallback((id: string) => {
    const previous = current.current;
    const favorites = previous.favorites.includes(id)
      ? previous.favorites.filter((value) => value !== id)
      : [...previous.favorites, id];
    const next = { ...previous, favorites };
    current.current = next;
    setLibrary(next);
    FavoritesRepository.save(favorites);
  }, []);
  const played = useCallback((id: string) => {
    const previous = current.current;
    const recent = [
      { gameId: id, lastPlayedAt: Date.now() },
      ...previous.recent.filter((entry) => entry.gameId !== id),
    ].slice(0, 40);
    const next = { ...previous, recent };
    current.current = next;
    setLibrary(next);
    RecentRepository.save(recent);
  }, []);
  const clearRecent = useCallback(() => {
    const next = { ...current.current, recent: [] };
    current.current = next;
    setLibrary(next);
    RecentRepository.save([]);
  }, []);
  return (
    <Context.Provider
      value={{ ...library, loaded, toggle, played, clearRecent }}
    >
      {children}
    </Context.Provider>
  );
}

export const useLibrary = () => useContext(Context);
