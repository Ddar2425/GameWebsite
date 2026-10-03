import { notFound } from "next/navigation";
import Link from "next/link";
import { GameRepository } from "@/lib/games";
import { Header } from "@/components/Header";
import { GameCard } from "@/components/GameCard";
import { PlayerLoader } from "@/components/PlayerLoader";
import { AdSlot, PromoTile } from "@/components/AdSlot";
import { CategoryNav } from "@/components/Catalog";
export function generateStaticParams() {
  return GameRepository.all().map((g) => ({ slug: g.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const g = GameRepository.find(slug);
  return {
    title: g?.title || "Game not found",
    description: g
      ? `Play ${g.title} online. ${g.description}`
      : "Game not found.",
  };
}
export default async function GamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const game = GameRepository.find(slug);
  if (!game) notFound();
  const related = GameRepository.related(slug);
  return (
    <main className="game-page">
      <div className="game-layout">
        <aside className="left-rail">
          <Header />
          <div className="rail-promo">
            <PromoTile />
          </div>
          {related.slice(0, 3).map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </aside>
        <section className="game-main">
          <PlayerLoader key={game.id} game={game} />
          <AdSlot placement="game-bottom" />
          <section className="game-info">
            <h2>About {game.title}</h2>
            <p>{game.description}</p>
            <h3>
              {game.availability === "coming-soon"
                ? "Availability"
                : "How to play"}
            </h3>
            <ul>
              {game.controls.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <div className="game-tags">
              {game.categories.map((c) => (
                <Link key={c} href={`/category/${c.toLowerCase()}`}>
                  {c}
                </Link>
              ))}
            </div>
            <p className="package-note">
              {game.availability === "coming-soon"
                ? "This game is coming soon. Explore the related games below while you wait."
                : "Original Sproutplay mini-game. Keyboard and touch supported."}
            </p>
          </section>
        </section>
        <aside className="right-rail">
          <AdSlot placement="game-sidebar" format="skyscraper" />
          <div className="side-games">
            {related.slice(3, 11).map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
        </aside>
      </div>
      <section className="related-section">
        <h2>More games you might like</h2>
        <div className="simple-grid">
          {related.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      </section>
      <CategoryNav />
    </main>
  );
}
