export interface Game {
  id: string;
  slug: string;
  title: string;
  alternateTitles?: string[];
  description: string;
  category: string;
  categories: string[];
  tags: string[];
  thumbnail: string;
  featured?: boolean;
  popular?: boolean;
  new?: boolean;
  launchType: "iframe" | "html5" | "external" | "webgl";
  gameUrl?: string;
  aspectRatio: string;
  controls: string[];
  createdAt: string;
  playCount: number;
  availability?: "available" | "coming-soon";
  readiness?: "message" | "load";
  engine?: string;
  level?: number;
  author: string;
}
