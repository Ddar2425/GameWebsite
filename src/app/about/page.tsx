import { Header } from "@/components/Header";
export const metadata = { title: "About & licenses" };
export default function About() {
  return (
    <main className="about-page">
      <Header />
      <article className="game-info">
        <h1>Small games. Big breaks.</h1>
        <p>
          Sproutplay is an original browser-game portal. All 64 mini-games and
          thumbnail illustrations were created for this project. They span eight
          mechanics, each with eight named difficulty variants.
        </p>
        <h2>Your library belongs to you</h2>
        <p>
          Favorites and recent games are stored in your browser on this device.
          There are no accounts, analytics, advertisements, or third-party game
          scripts.
        </p>
        <h2>Game licenses</h2>
        <p>
          The bundled code and vector artwork are original project assets. No
          assets or games from the reference website are redistributed. Block
          World is coming soon. The site does not distribute proprietary games
          or third-party assets.
        </p>
        <h2>Local multiplayer</h2>
        <p>
          Paddle games support two players sharing one keyboard or touch screen.
          Online multiplayer requires a separately authorized game integration.
        </p>
      </article>
    </main>
  );
}
