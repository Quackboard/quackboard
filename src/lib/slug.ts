// Reserved slugs that cannot be used
export const RESERVED_SLUGS = [
  'create',
  'edit',
  'dashboard',
  'login',
  'signup',
  'settings',
  'admin',
  'api',
  'auth',
  'onboarding',
  'producer',
  'events',
];

/**
 * Generate a URL-safe slug from a name
 * Examples:
 * - "Sarah Cotenoff" → "sarah-cotenoff"
 * - "The Comedy Store!" → "the-comedy-store"
 * - "Mike's Mics" → "mikes-mics"
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '');     // Remove leading/trailing hyphens
}

/**
 * Validate a slug string
 * Returns null if valid, or an error message if invalid
 */
export function validateSlug(slug: string): string | null {
  if (slug.length < 3) {
    return 'Page URL must be at least 3 characters';
  }
  if (slug.length > 50) {
    return 'Page URL must be 50 characters or less';
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return 'Only letters, numbers, and hyphens allowed';
  }
  if (/--/.test(slug)) {
    return 'Consecutive hyphens are not allowed';
  }
  if (slug.startsWith('-') || slug.endsWith('-')) {
    return 'Cannot start or end with a hyphen';
  }
  if (RESERVED_SLUGS.includes(slug)) {
    return 'This URL is reserved. Try another.';
  }
  return null;
}

/**
 * Check if a string is a valid UUID
 */
export function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}
