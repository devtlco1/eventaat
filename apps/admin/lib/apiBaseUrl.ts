/**
 * Resolves the API base URL for browser `fetch` calls. Empty or missing
 * `NEXT_PUBLIC_API_URL` would otherwise produce relative URLs and hit the
 * Next.js app (e.g. "Cannot GET /me/notifications" from the dev server).
 */
export function getApiBaseUrl(): string {
  const v = process.env.NEXT_PUBLIC_API_URL;
  if (v == null || String(v).trim() === '') {
    return 'http://localhost:4000';
  }
  return String(v).trim().replace(/\/$/, '');
}
