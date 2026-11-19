/**
 * Forgiving readers for environment variables. Values pasted into a hosting dashboard often carry
 * stray spaces, quotes or a missing "https://"; we clean those up rather than failing the build.
 */

/** Trims whitespace and surrounding quotes; empty becomes undefined. */
export function cleanValue(raw: string | undefined): string | undefined {
  const v = raw
    ?.trim()
    .replace(/^(['"])(.*)\1$/, "$2")
    .trim();
  return v ? v : undefined;
}

/** Returns a normalised origin-style URL (scheme added if missing, no trailing slash), or null if unusable. */
export function normalizeUrl(
  raw: string | undefined,
): string | null | undefined {
  const v = cleanValue(raw);
  if (!v) return undefined;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(v)
    ? v
    : `${/^(localhost|127\.0\.0\.1)(:|$)/.test(v) ? "http" : "https"}://${v}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname.includes(".") && url.hostname !== "localhost")
      return null;
    return url.href.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

export function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export class EnvError extends Error {
  constructor(name: string, problem: string) {
    super(
      `Environment variable ${name} ${problem}. Fix it in .env.local or your hosting settings (see .env.example).`,
    );
    this.name = "EnvError";
  }
}
