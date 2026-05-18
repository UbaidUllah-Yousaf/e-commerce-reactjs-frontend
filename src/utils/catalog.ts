import type { Collection, Product, ProductVariant } from '../types/catalog'
import { canonicalImageUrl, imageUrlDedupeKey } from './image'

export function parseMoney(value: string | null | undefined): number {
  if (value == null || value === '') return 0
  const n = Number.parseFloat(value)
  return Number.isFinite(n) ? n : 0
}

/** Prefer in-stock active variant, then first active, then first overall. */
export function getDefaultVariant(product: Product): ProductVariant | null {
  if (!product.variants?.length) return null
  const active = product.variants.filter((v) => v.is_active)
  const pool = active.length > 0 ? active : product.variants
  const inStock = pool.find((v) => v.inventory_quantity > 0)
  return inStock ?? pool[0] ?? null
}

export function collectGalleryImages(product: Product, variant: ProductVariant | null): string[] {
  const ordered: string[] = []
  const seen = new Set<string>()
  const push = (raw: string | null | undefined) => {
    const u = raw?.trim()
    if (!u) return
    const key = imageUrlDedupeKey(u)
    if (seen.has(key)) return
    seen.add(key)
    ordered.push(canonicalImageUrl(u))
  }

  push(product.featured_image)
  if (variant?.image) push(variant.image)
  for (const v of product.variants ?? []) {
    push(v.image)
  }
  return ordered
}

export function findVariantByValueIds(product: Product, valueIds: number[]): ProductVariant | undefined {
  const variants = product.variants ?? []
  if (valueIds.length === 0) {
    return variants.find((v) => (v.option_values?.length ?? 0) === 0) ?? variants[0]
  }
  const want = new Set(valueIds)
  return variants.find(
    (v) =>
      (v.option_values?.length ?? 0) === valueIds.length &&
      (v.option_values ?? []).every((ov) => want.has(ov.id)),
  )
}

export function initialOptionSelections(product: Product, variant: ProductVariant | null): Record<number, number> {
  const map: Record<number, number> = {}
  const valuesByOption = variant?.option_values ?? []
  for (const ov of valuesByOption) {
    map[ov.option] = ov.id
  }
  for (const opt of product.options ?? []) {
    if (map[opt.id] == null && opt.values?.[0]) {
      map[opt.id] = opt.values[0].id
    }
  }
  return map
}

export function selectionRecordToSortedValueIds(selection: Record<number, number>): number[] {
  return Object.keys(selection)
    .map((k) => Number(k))
    .sort((a, b) => a - b)
    .map((optionId) => selection[optionId])
    .filter((id) => id != null)
}

export function normalizeProductListPayload(data: unknown): Product[] {
  if (Array.isArray(data)) {
    return data as Product[]
  }
  if (
    data &&
    typeof data === 'object' &&
    'results' in data &&
    Array.isArray((data as { results: unknown }).results)
  ) {
    return (data as { results: Product[] }).results
  }
  throw new Error('Unexpected products list response')
}

export function isProductShownOnStorefront(p: Product): boolean {
  return p.is_published && p.status === 'active'
}

export function isCollectionListed(c: Collection): boolean {
  return c.is_active !== false
}

/** Supports nested `{ id }`, bare numeric PK, or numeric string from DRF list serializers. */
export function getProductCollectionId(product: Product): number | null {
  const raw = product.collection as unknown
  if (raw == null) return null
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string') {
    const n = Number.parseInt(raw, 10)
    return Number.isFinite(n) ? n : null
  }
  if (typeof raw === 'object' && raw !== null && 'id' in raw) {
    const id = (raw as { id: unknown }).id
    if (typeof id === 'number' && Number.isFinite(id)) return id
    if (typeof id === 'string') {
      const n = Number.parseInt(id, 10)
      return Number.isFinite(n) ? n : null
    }
  }
  return null
}

/** Title + artwork for breadcrumbs; prefers nested product payload, falls back to list lookup. */
export function resolveCollectionPresentation(
  product: Product,
  list?: Collection[],
): { id: number | null; title: string; image?: string | null } {
  const id = getProductCollectionId(product)
  const raw = product.collection
  let nestedTitle: string | undefined
  let nestedImage: string | null | undefined
  if (raw != null && typeof raw === 'object') {
    const o = raw as Collection
    nestedTitle = o.title
    nestedImage = o.image
  }
  const row = id != null ? list?.find((c) => c.id === id) : undefined
  return {
    id,
    title: nestedTitle ?? row?.title ?? (id != null ? 'Collection' : 'Catalog'),
    image: row?.image ?? nestedImage ?? null,
  }
}

export function filterProductsByCollection(products: Product[], collectionId: number | null): Product[] {
  if (collectionId == null || !Number.isFinite(collectionId)) return products
  return products.filter((p) => getProductCollectionId(p) === collectionId)
}
