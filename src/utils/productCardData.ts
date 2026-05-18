import type { Product, ProductVariant } from '../types/catalog'
import { collectGalleryImages, parseMoney } from './catalog'

export interface ProductCardVariantChoice {
  variantId: number
  label: string
  hex: string
  image: string
  price: number
  compareAt?: number
}

const HEX_FALLBACK = ['#3d3d3d', '#8b7355', '#2d4a3e', '#6b3a4a', '#b8860b']

function hexForLabel(label: string, i: number): string {
  const t = label.toLowerCase()
  if (/\bblk|black|nero|noir/i.test(t)) return '#1c1c1c'
  if (/\bwhit|cream|ivory|pearl/i.test(t)) return '#e5e3df'
  if (/\bgreen|olive|sage|mint/i.test(t)) return '#3d5c4a'
  if (/\bred|berry|rose|wine/i.test(t)) return '#a61f35'
  if (/\bblue|navy|denim/i.test(t)) return '#2c3e6b'
  return HEX_FALLBACK[i % HEX_FALLBACK.length]
}

function variantLabel(v: ProductVariant): string {
  const ov = v.option_values?.[0]
  if (ov?.value) {
    const s = ov.value.trim()
    return s.length > 12 ? `${s.slice(0, 12)}…` : s
  }
  const title = v.title?.trim()
  if (title) return title.length > 14 ? `${title.slice(0, 14)}…` : title
  return 'Option'
}

/** Multi-variant swatches for product cards (single-variant products → undefined). */
export function buildProductCardVariantChoices(product: Product): ProductCardVariantChoice[] | undefined {
  const variants = (product.variants ?? []).filter((v) => v.is_active)
  if (variants.length <= 1) return undefined
  return variants.slice(0, 5).map((v, i) => {
    const label = variantLabel(v)
    const thumb = collectGalleryImages(product, v)[0]
    const compareRaw = v.compare_at_price
    return {
      variantId: v.id,
      label,
      hex: hexForLabel(label, i),
      image: thumb ?? product.featured_image ?? '',
      price: parseMoney(v.price),
      compareAt: compareRaw ? parseMoney(compareRaw) : undefined,
    }
  })
}

export function productCardSubtitle(product: Product): string | undefined {
  const v = product.vendor?.trim()
  if (v) return v
  const y = new Date(product.created_at).getFullYear()
  if (Number.isFinite(y)) return `Collection ${y}`
  return undefined
}

const NEW_PRODUCT_DAYS = 28

/** “New” ribbon from listing date — does not use catalog tags. */
export function productCardShowNewBadge(product: Product): boolean {
  const t = new Date(product.created_at).getTime()
  if (!Number.isFinite(t)) return false
  return Date.now() - t < NEW_PRODUCT_DAYS * 86400000
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Short plain-text excerpt for card body (marble reference layout). */
export function productCardDescriptionExcerpt(product: Product, maxChars = 100): string | undefined {
  const raw = product.description?.trim()
  if (!raw) return undefined
  const text = stripHtmlToText(raw)
  if (!text) return undefined
  if (text.length <= maxChars) return text
  return `${text.slice(0, maxChars).trim()}…`
}

/** Dots under product image: variants or gallery depth, capped. */
export function productCardCarouselDotCount(
  product: Product,
  variant: ProductVariant | null,
  variantChoiceCount: number,
): number {
  const g = collectGalleryImages(product, variant).length
  const fromVariants = variantChoiceCount > 1 ? variantChoiceCount : 0
  const n = Math.max(1, fromVariants || g || 1)
  return Math.min(n, 6)
}
