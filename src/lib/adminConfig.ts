const rawDesignatedEmails =
  (import.meta.env.VITE_DESIGNATED_ADMIN_EMAILS as string | undefined) || '';

/**
 * List of additional admin emails configured via `VITE_DESIGNATED_ADMIN_EMAILS`.
 * Empty by default so no personal email is hardcoded in source control.
 */
export const DESIGNATED_ADMIN_EMAILS: string[] = rawDesignatedEmails
  .split(',')
  .map((entry) => entry.trim().toLowerCase())
  .filter(Boolean);

/**
 * Returns true if the supplied email is explicitly allowlisted via `VITE_DESIGNATED_ADMIN_EMAILS`.
 */
export function isDesignatedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return DESIGNATED_ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
