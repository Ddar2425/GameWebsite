"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play,
  RotateCcw,
  Maximize,
  Minimize,
  Heart,
  AlertTriangle,
  LoaderCircle,
  ArrowLeft,
  Clock,
} from "lucide-react";
import type { Game } from "@/types/game";
import { isAllowedGameUrl } from "@/lib/embed.mjs";
import { useLibrary } from "./LibraryProvider";

type PlayerState = "idle" | "loading" | "ready" | "error";

export function GamePlayer({ game }: { game: Game }) {
  const [state, setState] = useState<PlayerState>("idle");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [source, setSource] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");
  const container = useRef<HTMLDivElement>(null);
  const iframe = useRef<HTMLIFrameElement>(null);
  const completedAttempt = useRef(0);
  const { favorites, toggle, played, loaded } = useLibrary();
  const saved = favorites.includes(game.id);
  const externalUrl = game.launchType === "external" && game.externalUrl === "https://www.kodub.com/apps/polytrack" ? game.externalUrl : null;
  const comingSoon = game.availability === "coming-soon";

  const focusPlayer = useCallback(() => {
    if (container.current?.closest("[inert]")) return;
    iframe.current?.focus();
    iframe.current?.contentWindow?.focus();
  }, []);

  const start = useCallback(() => {
    if (comingSoon) return;
    if (!isAllowedGameUrl(game.gameUrl)) {
      setError(
        "This game is not available to play. Please choose another game.",
      );
      setState("error");
      return;
    }
    setSource(null);
    setError("");
    setState("loading");
    setAttempt((n) => n + 1);
  }, [game.gameUrl, comingSoon]);

  useEffect(() => {
    const change = () =>
      setFullscreen(document.fullscreenElement === container.current);
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, []);

  useEffect(() => {
    if (state !== "loading" || !game.gameUrl) return;
    const url = game.gameUrl;
    const controller = new AbortController();
    let active = true;
    const fail = (message: string) => {
      if (!active) return;
      active = false;
      setError(message);
      setSource(null);
      setState("error");
    };
    const timer = setTimeout(
      () => fail("This game is taking too long to load. Please try again."),
      20000,
    );
    const ready = (event: MessageEvent) => {
      if (
        !active ||
        event.source !== iframe.current?.contentWindow ||
        event.data?.type !== "sprout:ready"
      )
        return;
      // Both window identity and origin must match the registered package.
      if (event.origin !== new URL(url, window.location.origin).origin) return;
      active = false;
      completedAttempt.current = attempt;
      setState("ready");
      played(game.id);
      focusPlayer();
    };
    window.addEventListener("message", ready);
    async function prepare() {
      try {
        if (url.startsWith("/")) {
          const response = await fetch(url, {
            method: "HEAD",
            signal: controller.signal,
          });
          if (!active) return;
          if (!response.ok) {
            fail(
              "This game is temporarily unavailable. Try again or choose another game.",
            );
            return;
          }
          if (!response.headers.get("content-type")?.includes("text/html")) {
            fail("The game could not be opened. Please choose another game.");
            return;
          }
        }
        // Mount the iframe only after the package check succeeds, so a fast ready
        // message cannot bypass a slow or failed download check.
        if (active) setSource(url);
      } catch (exception) {
        if (!controller.signal.aborted)
          fail(
            "The game could not be downloaded. Check your connection and try again.",
          );
      }
    }
    void prepare();
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
      window.removeEventListener("message", ready);
    };
  }, [state, attempt, game.gameUrl, game.id, played, focusPlayer]);

  const onFrameLoad = () => {
    // Catalogs may explicitly opt an approved external publisher into native
    // load readiness when that publisher does not support a ready handshake.
    if (
      !source?.startsWith("https://") ||
      game.readiness !== "load" ||
      state !== "loading" ||
      completedAttempt.current === attempt
    )
      return;
    completedAttempt.current = attempt;
    setState("ready");
    played(game.id);
    focusPlayer();
  };

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === container.current)
        await document.exitFullscreen();
      else if (container.current?.requestFullscreen)
        await container.current.requestFullscreen();
      else throw new Error("Fullscreen unavailable");
      setFullscreenError("");
    } catch {
      setFullscreenError(
        "Fullscreen is unavailable in this browser. You can still play here.",
      );
    }
  }

  return (
    <div className="player-shell" ref={container}>
      <div
        className="player-stage"
        style={{ aspectRatio: game.aspectRatio }}
        aria-busy={state === "loading"}
      >
        {source && (state === "loading" || state === "ready") && (
          <iframe
            key={attempt}
            ref={iframe}
            src={source}
            title={`Play ${game.title}`}
            className={state === "ready" ? "ready" : ""}
            sandbox="allow-scripts allow-pointer-lock allow-same-origin"
            allow="autoplay; fullscreen; gamepad; xr-spatial-tracking"
            allowFullScreen
            onLoad={onFrameLoad}
            onError={() => {
              setSource(null);
              setError("The game could not load. Please try again.");
              setState("error");
            }}
          />
        )}
        {state === "idle" && (
          <div className="player-overlay idle-overlay">
            <img src={game.thumbnail} alt="" className="player-preview" />
            <div className="play-prompt">
              <img src={game.thumbnail} alt="" width="88" height="88" />
              <h2>{game.title}</h2>
              {comingSoon ? (
                <>
                  <span className="coming-soon-label">
                    <Clock size={18} />
                    Coming soon
                  </span>
                  <p>This adventure isn’t available to play yet.</p>
                  <Link href="/games" className="player-back">
                    Find a game to play{" "}
                    <ArrowLeft className="browse-arrow" size={16} />
                  </Link>
                </>
              ) : externalUrl ? (
                <>
                  <a href={externalUrl} target="_blank" rel="noopener noreferrer" className="play-button">
                    <Play fill="currentColor" size={22} />
                    Play on official site
                  </a>
                  <p>Opens the creator’s browser game in a new tab.</p>
                </>
              ) : (
                <>
                  <button onClick={start} className="play-button">
                    <Play fill="currentColor" size={22} />
                    Play now
                  </button>
                  <p>Original game · No downloads</p>
                </>
              )}
            </div>
          </div>
        )}
        {state === "loading" && (
          <div className="player-overlay" role="status">
            <LoaderCircle className="spinner" size={38} />
            <h2>Loading {game.title}</h2>
            <p>Getting your game ready…</p>
          </div>
        )}
        {state === "error" && (
          <div className="player-overlay error-overlay" role="alert">
            <AlertTriangle size={40} />
            <h2>Couldn’t load this game</h2>
            <p>{error}</p>
            <button className="primary-button" onClick={start}>
              <RotateCcw size={18} />
              Try again
            </button>
            <Link href="/games" className="player-back">
              <ArrowLeft size={16} />
              Browse another game
            </Link>
          </div>
        )}
      </div>
      <div className="player-toolbar">
        <div className="player-title">
          <img src={game.thumbnail} alt="" width="48" height="48" />
          <div>
            <h1>{game.title}</h1>
            <p>by {game.author}</p>
          </div>
        </div>
        <div className="player-actions">
          <button
            disabled={!loaded}
            aria-label={`${saved ? "Unsave" : "Save"} ${game.title}`}
            aria-pressed={saved}
            onClick={() => toggle(game.id)}
            className={saved ? "saved" : ""}
          >
            <Heart fill={saved ? "currentColor" : "none"} size={21} />
            <span>Favorite</span>
          </button>
          <button
            disabled={comingSoon || Boolean(externalUrl)}
            aria-label="Reload game"
            onClick={start}
          >
            <RotateCcw size={21} />
            <span>Reload</span>
          </button>
          <button
            disabled={Boolean(externalUrl)}
            aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            onClick={toggleFullscreen}
          >
            {fullscreen ? <Minimize size={21} /> : <Maximize size={21} />}
            <span>Fullscreen</span>
          </button>
        </div>
      </div>
      {fullscreenError && (
        <p className="fullscreen-error" role="status">
          {fullscreenError}
        </p>
      )}
    </div>
  );
}
