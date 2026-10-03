export const allowedEmbedOrigins = [];

export function isAllowedGameUrl(value) {
  if (
    typeof value !== "string" ||
    !value ||
    /[\u0000-\u0020\u007f\\]/.test(value)
  )
    return false;
  try {
    if (value.startsWith("/games/")) {
      const url = new URL(value, "https://sproutplay.invalid");
      // Deliberately accept plain local package paths, not encoded separators or
      // dot segments that different servers could interpret differently.
      const path = value.split(/[?#]/, 1)[0];
      return (
        url.origin === "https://sproutplay.invalid" &&
        url.pathname === path &&
        /^\/games\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-][A-Za-z0-9._-]*\.html$/.test(
          path,
        )
      );
    }
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      allowedEmbedOrigins.includes(url.origin)
    );
  } catch {
    return false;
  }
}
