"use client";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Menu,
  Heart,
  Clock,
  Home,
  Grid2X2,
  X,
  Leaf,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { GameRepository } from "@/lib/games";
import { categories } from "@/data/categories";
import { GameCard } from "./GameCard";
export function Header() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [drawer, setDrawer] = useState<"search" | "menu" | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState(-1);
  const router = useRouter();
  const pathname = usePathname();
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const results = GameRepository.search(query).filter(
    (g) => !category || g.categories.includes(category),
  );
  useEffect(() => {
    if (selected >= 0)
      document
        .getElementById(`suggestion-${selected}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [selected]);
  const close = () => setDrawer(null);
  const open = (kind: "menu" | "search") => {
    opener.current = document.activeElement as HTMLElement;
    setDrawer(kind);
  };
  useEffect(() => {
    setDrawer(null);
  }, [pathname]);
  useEffect(() => {
    if (!drawer) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const background = [
      ...document.querySelectorAll<HTMLElement>(
        "#content,body>footer,.skip-link",
      ),
    ];
    const inertBefore = background.map((element) => element.inert);
    background.forEach((element) => {
      element.inert = true;
    });
    const id = requestAnimationFrame(() => {
      if (drawer === "search") input.current?.focus();
      else panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
    });
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setDrawer(null);
      }
      if (e.key === "Tab") {
        const nodes = panel.current?.querySelectorAll<HTMLElement>(
          'a[href]:not([tabindex="-1"]),button:not([disabled]),input',
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    let lastFocused: HTMLElement | null = null;
    const keepFocus = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      if (panel.current?.contains(target)) {
        lastFocused = target;
      } else {
        const fallback =
          drawer === "search"
            ? input.current
            : panel.current?.querySelector<HTMLButtonElement>("button");
        (lastFocused?.isConnected ? lastFocused : fallback)?.focus();
      }
    };
    document.addEventListener("focusin", keepFocus);
    document.addEventListener("keydown", key);
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = previous;
      background.forEach((element, i) => {
        element.inert = inertBefore[i];
      });
      document.removeEventListener("keydown", key);
      document.removeEventListener("focusin", keepFocus);
      if (opener.current?.isConnected) opener.current.focus();
    };
  }, [drawer]);
  return (
    <>
      <header className="brand-tile">
        <Link href="/" className="wordmark" aria-label="Sproutplay home">
          <Leaf size={28} strokeWidth={2.5} />
          <strong>sproutplay</strong>
        </Link>
        <div className="brand-actions">
          <button
            disabled={!hydrated}
            aria-label="Open menu"
            onClick={() => open("menu")}
          >
            <Menu size={26} />
          </button>
          <button
            disabled={!hydrated}
            aria-label="Search games"
            onClick={() => open("search")}
          >
            <Search size={27} />
          </button>
        </div>
      </header>
      {drawer &&
        createPortal(
          <div className="drawer-layer">
            <button
              className="drawer-backdrop"
              tabIndex={-1}
              aria-label="Close panel"
              onClick={close}
            />
            <div
              className={`drawer ${drawer === "search" ? "search-drawer" : "menu-drawer"}`}
              ref={panel}
              role="dialog"
              aria-modal="true"
              aria-label={
                drawer === "search" ? "Search games" : "Navigation menu"
              }
            >
              <div className="drawer-heading">
                <button aria-label="Close panel" onClick={close}>
                  <ArrowLeft />
                </button>
                <h2>{drawer === "search" ? "Search" : "Menu"}</h2>
              </div>
              {drawer === "search" ? (
                <div className="drawer-body">
                  <form
                    className="search-input"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (selected >= 0 && results[selected]) {
                        router.push(`/games/${results[selected].slug}`);
                      } else
                        router.push(
                          `/search?q=${encodeURIComponent(query)}${category ? `&category=${category.toLowerCase()}` : ""}`,
                        );
                      close();
                    }}
                  >
                    <Search size={22} />
                    <input
                      ref={input}
                      placeholder="What are you playing today?"
                      aria-label="Search games by title or category"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setSelected(-1);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                          e.preventDefault();
                          if (results.length === 0) {
                            setSelected(-1);
                            return;
                          }
                          const last = Math.min(results.length, 24) - 1;
                          setSelected((prev) =>
                            prev < 0
                              ? e.key === "ArrowDown"
                                ? 0
                                : last
                              : Math.max(
                                  0,
                                  Math.min(
                                    last,
                                    prev + (e.key === "ArrowDown" ? 1 : -1),
                                  ),
                                ),
                          );
                        }
                      }}
                      role="combobox"
                      aria-expanded={true}
                      aria-autocomplete="list"
                      aria-haspopup="listbox"
                      aria-controls="search-results"
                      aria-activedescendant={
                        selected >= 0 ? `suggestion-${selected}` : undefined
                      }
                      autoComplete="off"
                    />
                    {query && (
                      <button
                        type="button"
                        aria-label="Clear search"
                        onClick={() => {
                          setQuery("");
                          setSelected(-1);
                          input.current?.focus();
                        }}
                      >
                        <X size={18} />
                      </button>
                    )}
                  </form>
                  <div className="filter-pills">
                    {categories.map((c) => (
                      <button
                        key={c}
                        className={category === c ? "active" : ""}
                        aria-pressed={category === c}
                        onClick={() => {
                          setCategory(category === c ? "" : c);
                          setSelected(-1);
                        }}
                      >
                        {c.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <div className="device-pills" aria-label="Supported devices">
                    <span>DESKTOP</span>
                    <span>MOBILE</span>
                    <span>TABLET</span>
                  </div>
                  <div className="results-heading">
                    <span aria-live="polite">
                      {query || category
                        ? `${results.length} games`
                        : "Top Games"}
                    </span>
                    {(query || category) && (
                      <button
                        onClick={() => {
                          setQuery("");
                          setCategory("");
                          setSelected(-1);
                        }}
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                  <div
                    id="search-results"
                    className="search-grid"
                    role="listbox"
                    aria-label="Game suggestions"
                  >
                    {results.slice(0, 24).map((g, i) => (
                      <div
                        className={i === selected ? "selected-result" : ""}
                        key={g.id}
                      >
                        <GameCard
                          game={g}
                          suggestion={{
                            id: `suggestion-${i}`,
                            selected: i === selected,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  {results.length === 0 && (
                    <div className="empty-state">
                      <Search />
                      <h3>No games found</h3>
                      <p>Try another title, category, or tag.</p>
                    </div>
                  )}
                  {results.length > 24 && (
                    <Link
                      className="text-button"
                      href={`/search?q=${encodeURIComponent(query)}${category ? `&category=${category.toLowerCase()}` : ""}`}
                      onClick={close}
                    >
                      View all {results.length} results →
                    </Link>
                  )}
                  <p className="search-help">
                    ↑ ↓ to select · Enter to open · Esc to close
                  </p>
                </div>
              ) : (
                <nav className="menu-links">
                  {[
                    ["/", "Home", Home],
                    ["/games", "All games", Grid2X2],
                    ["/favorites", "Favorites", Heart],
                    ["/recent", "Recently played", Clock],
                  ].map(([href, label, Icon]) => {
                    const I = Icon as typeof Home;
                    return (
                      <Link
                        key={String(href)}
                        href={String(href)}
                        aria-current={pathname === href ? "page" : undefined}
                        onClick={close}
                      >
                        <I size={22} />
                        {String(label)}
                      </Link>
                    );
                  })}
                  <h3>Categories</h3>
                  {categories.map((c) => (
                    <Link
                      key={c}
                      href={`/category/${c.toLowerCase()}`}
                      aria-current={
                        pathname === `/category/${c.toLowerCase()}`
                          ? "page"
                          : undefined
                      }
                      onClick={close}
                    >
                      {c}
                    </Link>
                  ))}
                  <p>Original games. No accounts needed.</p>
                </nav>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
