'use client';

/**
 * Society Metadata Protection:
 * This component renders nothing to prevent manual DOM manipulation of head elements.
 * Metadata is managed exclusively via the Next.js 15 Metadata API in layout.tsx
 * to avoid Runtime TypeError: removeChild on node errors.
 */
export function DynamicFavicon() {
  return null;
}
