import type { Metadata } from "next";
import "./globals.css";
import { LibraryProvider } from "@/components/LibraryProvider";
import { Footer } from "@/components/Footer";
export const metadata: Metadata = {
  title: {
    default: "Sproutplay — A little break. A lot of play.",
    template: "%s | Sproutplay",
  },
  description:
    "Play original browser games. Explore arcade, racing, puzzle games and more. Save your favorites and pick up where you left off.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#content">
          Skip to content
        </a>
        <LibraryProvider>
          <div id="content" tabIndex={-1}>
            {children}
          </div>
          <Footer />
        </LibraryProvider>
      </body>
    </html>
  );
}
