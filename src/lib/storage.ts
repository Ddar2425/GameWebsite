export interface RecentEntry {
  gameId: string;
  lastPlayedAt: number;
}

const validId = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= 200;
const read = (key: string): unknown => {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
};
const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* The current session remains usable when browser storage is unavailable. */
  }
};

export const FavoritesRepository = {
  read(): string[] {
    const value = read("app:favorites");
    return Array.isArray(value) ? [...new Set(value.filter(validId))] : [];
  },
  save: (ids: string[]) => write("app:favorites", ids),
};

export const RecentRepository = {
  read(): RecentEntry[] {
    const value = read("app:recent");
    if (!Array.isArray(value)) return [];
    const sorted = value
      .filter(
        (entry): entry is RecentEntry =>
          entry &&
          validId(entry.gameId) &&
          Number.isFinite(entry.lastPlayedAt) &&
          entry.lastPlayedAt > 0,
      )
      .sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);
    const seen = new Set<string>();
    return sorted
      .filter((entry) => {
        if (seen.has(entry.gameId)) return false;
        seen.add(entry.gameId);
        return true;
      })
      .slice(0, 40);
  },
  save: (entries: RecentEntry[]) => write("app:recent", entries),
};
