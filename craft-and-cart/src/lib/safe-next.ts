/**
 * The page to return to after signing in. Only paths on THIS site are accepted
 * (no "//evil.com", no full URLs), and never the sign-in pages themselves (that would loop).
 */
export function safeNext(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return null;
  if (/^\/(login|forgot-password|reset-password)(\/|\?|#|$)/.test(raw)) return null;
  return raw;
}

/** Where a customer lands after sign-up / sign-in when no page was requested: the shop, never /account. */
export const AFTER_LOGIN_HOME = "/shop";
