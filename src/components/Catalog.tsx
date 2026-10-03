"use client";
import { useState } from "react";
import Link from "next/link";
import { Heart, Clock, Search } from "lucide-react";
import { GameRepository } from "@/lib/games";
import { categories } from "@/data/categories";
import type { Game } from "@/types/game";
import { useLibrary } from "./LibraryProvider";
import { Header } from "./Header";
import { GameCard, GameCardSkeleton } from "./GameCard";
import { PromoTile } from "./AdSlot";
export function CategoryNav() {
  return (
    <nav className="category-nav" aria-label="Game categories">
      {categories.map((c) => (
        <Link href={`/category/${c.toLowerCase()}`} key={c}>
          {c.toUpperCase()} GAMES
        </Link>
      ))}
    </nav>
  );
}
export function Catalog({
  mode = "home",
  title,
  query = "",
  category,
}: {
  mode?: "home" | "games" | "category" | "search" | "favorites" | "recent";
  title?: string;
  query?: string;
  category?: string;
}) {
  const { favorites, recent, loaded, clearRecent } = useLibrary();
  const [limit, setLimit] = useState(64);
  const [search, setSearch] = useState(query);
  let entries: Game[] = GameRepository.all();
  if (mode === "category") entries = GameRepository.category(category || "");
  if (mode === "search")
    entries = GameRepository.search(search).filter(
      (g) =>
        !category || g.categories.some((c) => c.toLowerCase() === category),
    );
  if (mode === "favorites")
    entries = entries.filter((g) => favorites.includes(g.id));
  if (mode === "recent")
    entries = recent
      .map((r) => entries.find((g) => g.id === r.gameId))
      .filter((g): g is Game => Boolean(g));
  const stored = mode === "favorites" || mode === "recent";
  const loading = stored && !loaded;
  return (
    <main className={`catalog-page ${mode === "home" ? "home-catalog" : ""}`}>
      {mode === "home" && (
        <h1 className="sr-only">Play original browser games</h1>
      )}
      <div className="mosaic">
        <Header />
        {mode === "home" && (
          <div className="mosaic-promo">
            <PromoTile />
          </div>
        )}
        {mode !== "home" && (
          <section
            className={`catalog-heading ${mode === "search" ? "search-heading" : ""}`}
          >
            <div>
              <h1>{title || "All games"}</h1>
              <p aria-live="polite">
                {loading
                  ? "Loading your library…"
                  : `${entries.length} ${entries.length === 1 ? "game" : "games"}${mode === "category" ? " to explore" : ""}`}
              </p>
            </div>
            {mode === "recent" && entries.length > 0 && (
              <button className="text-button" onClick={clearRecent}>
                Clear history
              </button>
            )}
            {mode === "search" && (
              <form className="page-search" action="/search">
                <Search size={20} />
                {category && (
                  <input type="hidden" name="category" value={category} />
                )}
                <input
                  name="q"
                  aria-label="Search catalog"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search games…"
                />
                <button className="text-button" type="submit">
                  Search
                </button>
              </form>
            )}
            {mode === "search" && category && (
              <div className="active-filter">
                {category}
                <Link
                  aria-label="Remove category filter"
                  href={`/search?q=${encodeURIComponent(search)}`}
                >
                  ×
                </Link>
              </div>
            )}
          </section>
        )}
        {loading
          ? Array.from({ length: 9 }, (_, i) => <GameCardSkeleton key={i} />)
          : entries
              .slice(0, limit)
              .map((game, i) => (
                <GameCard
                  key={game.id}
                  game={game}
                  featured={mode === "home" && game.featured}
                  priority={i < 20}
                />
              ))}
        {!loading && entries.length === 0 && (
          <div className="catalog-empty">
            <div className="empty-state">
              {mode === "favorites" ? (
                <Heart />
              ) : mode === "recent" ? (
                <Clock />
              ) : (
                <Search />
              )}
              <h2>
                {mode === "favorites"
                  ? "Your favorites start here"
                  : mode === "recent"
                    ? "Ready for your first game?"
                    : "No games found"}
              </h2>
              <p>
                {mode === "favorites"
                  ? "Tap the heart on any game to save it."
                  : mode === "recent"
                    ? "Play a game and it will appear here."
                    : "Try another title, category, or tag."}
              </p>
              <Link className="primary-button" href="/games">
                Explore games
              </Link>
            </div>
          </div>
        )}
      </div>
      {entries.length > limit && (
        <button className="load-more" onClick={() => setLimit(limit + 64)}>
          Show more games
        </button>
      )}
      {mode === "home" && loaded && recent.length > 0 && (
        <section className="recent-home">
          <h2>Recently played</h2>
          <div className="recent-strip">
            {recent.slice(0, 8).map((r) => {
              const g = GameRepository.all().find((g) => g.id === r.gameId);
              return g ? <GameCard key={g.id} game={g} /> : null;
            })}
          </div>
          <Link href="/recent">View your history →</Link>
        </section>
      )}
      <CategoryNav />
    </main>
  );
}
