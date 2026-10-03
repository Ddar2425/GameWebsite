"use client";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { Game } from "@/types/game";
import { useLibrary } from "./LibraryProvider";
export function GameCard({
  game,
  featured = false,
  priority = false,
  suggestion,
}: {
  game: Game;
  featured?: boolean;
  priority?: boolean;
  suggestion?: { id: string; selected: boolean };
}) {
  const image = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const { favorites, toggle, loaded: libraryLoaded } = useLibrary();
  const saved = favorites.includes(game.id);
  useEffect(() => {
    if (image.current?.complete) {
      setLoaded(true);
      if (!image.current.naturalWidth) setFailed(true);
    }
  }, []);
  return (
    <article
      className={`game-card ${featured ? "featured" : ""} ${loaded ? "loaded" : ""}`}
    >
      <Link
        id={suggestion?.id}
        role={suggestion ? "option" : undefined}
        aria-selected={suggestion?.selected}
        tabIndex={suggestion ? -1 : undefined}
        href={`/games/${game.slug}`}
        aria-label={`${game.availability === "coming-soon" ? "View" : "Play"} ${game.title}`}
        className="card-link"
      >
        {failed ? (
          <div className="image-fallback">{game.title}</div>
        ) : (
          <img
            ref={image}
            src={game.thumbnail}
            width={400}
            height={400}
            alt={game.title}
            loading={priority ? "eager" : "lazy"}
            onLoad={() => setLoaded(true)}
            onError={() => {
              setFailed(true);
              setLoaded(true);
            }}
          />
        )}
        <span className="card-caption">{game.title}</span>
        {game.availability === "coming-soon" && (
          <span className="package-badge">COMING SOON</span>
        )}
      </Link>
      {!suggestion && (
        <button
          disabled={!libraryLoaded}
          className={`card-favorite ${saved ? "saved" : ""}`}
          onClick={() => toggle(game.id)}
          aria-label={`${saved ? "Unsave" : "Save"} ${game.title}`}
          aria-pressed={saved}
        >
          <Heart size={16} fill={saved ? "currentColor" : "none"} />
        </button>
      )}
    </article>
  );
}
export const GameCardSkeleton = () => (
  <div className="game-card skeleton" aria-label="Loading game" />
);
