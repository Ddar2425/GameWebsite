import type { Game } from '../types/game';
export function normalize(value: string): string;
export function searchGames(games: Game[], query: string): Game[];
export function relatedGames(games: Game[], current: Game, limit?: number): Game[];
