import { games } from '@/data/games';
import { searchGames, relatedGames } from './search.mjs';
export const GameRepository = {
 all: () => games,
 find: (slug: string) => games.find(game => game.slug === slug),
 category: (slug: string) => games.filter(game => game.categories.some(c=>c.toLowerCase()===slug)),
 search: (query: string) => searchGames(games, query),
 related: (slug: string) => {const game=games.find(g=>g.slug===slug);return game?relatedGames(games,game):[];}
};
