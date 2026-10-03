export const categories = ['Arcade', 'Action', 'Racing', 'Sports', 'Puzzle', 'Platformer', 'Strategy', 'Casual', 'Multiplayer', 'Retro'] as const;
export const categorySlug = (category: string) => category.toLowerCase();
