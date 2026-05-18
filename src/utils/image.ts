import type { SyntheticEvent } from 'react'

export const FALLBACK_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 800'%3E%3Crect width='640' height='800' fill='%23f3f4f6'/%3E%3Cg fill='%239ca3af'%3E%3Crect x='220' y='280' width='200' height='160' rx='16'/%3E%3Ccircle cx='280' cy='340' r='28' fill='%23d1d5db'/%3E%3Cpath d='M220 430l60-52 54 44 42-32 44 40v10H220z' fill='%23d1d5db'/%3E%3C/g%3E%3Ctext x='320' y='500' text-anchor='middle' font-family='Arial,sans-serif' font-size='28' fill='%236b7280'%3ENo image%3C/text%3E%3C/svg%3E"

const normalizeImageUrl = (url: string) => {
  if (url.startsWith('http://')) {
    return `https://${url.slice(7)}`
  }
  return url
}

/** Stable URL for `<img src>` (upgrade http → https). */
export function canonicalImageUrl(url: string): string {
  const t = url.trim()
  if (!t) return t
  return normalizeImageUrl(t)
}

/**
 * Key for deduping the same asset (http/https, trailing slash, query-only variants).
 * Compares `origin + pathname` when parseable.
 */
export function imageUrlDedupeKey(url: string): string {
  const c = canonicalImageUrl(url)
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://placeholder.invalid'
    const u = new URL(c, base)
    return `${u.origin}${u.pathname}`.toLowerCase()
  } catch {
    return c.toLowerCase().replace(/\/+$/, '')
  }
}

export const getSafeImageSrc = (...candidates: Array<string | null | undefined>) => {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return canonicalImageUrl(candidate.trim())
    }
  }
  return FALLBACK_IMAGE
}

export const handleImageError = (event: SyntheticEvent<HTMLImageElement>) => {
  const image = event.currentTarget
  if (image.src !== FALLBACK_IMAGE) {
    image.src = FALLBACK_IMAGE
  }
}
