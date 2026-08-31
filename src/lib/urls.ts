import { z } from 'zod';

/**
 * User-controlled listing URLs are rendered as hrefs on bot and source pages.
 * Zod's `.url()` only checks `new URL()`, which accepts javascript:, data:,
 * and other non-http schemes — so HTTPS must be required explicitly.
 */
export function isHttpsUrl(value: string): boolean {
  if (!value.startsWith('https://')) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export const httpsUrl = z.string().url().refine(isHttpsUrl, 'Must use HTTPS');

/** Drop javascript:/data:/http: values so they are never used as hrefs. */
export function safeHref(url: string | undefined | null): string | undefined {
  return url && isHttpsUrl(url) ? url : undefined;
}
