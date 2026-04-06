/**
 * @fileOverview Society Integrity Filter - Profanity Guard
 */

const BANNED_WORDS = [
  'abuse', 'spam', 'hate', 'scam', 'fake'
  // Extend this registry with regional or industry prohibited terms
];

/**
 * Scans a string for prohibited language.
 * Returns true if clean, false if integrity is compromised.
 */
export function validateIntegrity(text: string): boolean {
  if (!text) return true;
  const lower = text.toLowerCase();
  return !BANNED_WORDS.some(word => lower.includes(word));
}

/**
 * Returns a sanitized version of the string or flags it for moderation.
 */
export function filterContent(text: string): { clean: string; flagged: boolean } {
  const isClean = validateIntegrity(text);
  return {
    clean: isClean ? text : text.replace(/[a-zA-Z]/g, '*'),
    flagged: !isClean
  };
}