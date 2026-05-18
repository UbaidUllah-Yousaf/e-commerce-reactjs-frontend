import type { Product } from '../types/catalog'
import { getDefaultVariant, parseMoney } from './catalog'

export type ListingSort = 'featured' | 'price-asc' | 'price-desc' | 'newest' | 'title-asc'

export interface ListingFilters {
  /** Plain-text search; synced to URL param `q`. */
  searchQuery: string
  tagIds: number[]
  vendors: string[]
  productTypes: string[]
  minPrice: number | null
  maxPrice: number | null
  inStockOnly: boolean
  sort: ListingSort
}

export const DEFAULT_LISTING_FILTERS: ListingFilters = {
  searchQuery: '',
  tagIds: [],
  vendors: [],
  productTypes: [],
  minPrice: null,
  maxPrice: null,
  inStockOnly: false,
  sort: 'featured',
}

export interface ListingFacets {
  tags: { id: number; name: string; count: number }[]
  vendors: { value: string; count: number }[]
  productTypes: { value: string; count: number }[]
  priceExtent: { min: number; max: number }
}

function displayPrice(product: Product): number {
  const variant = getDefaultVariant(product)
  return variant ? parseMoney(variant.price) : parseMoney(product.min_price)
}

function productInStock(product: Product): boolean {
  const variant = getDefaultVariant(product)
  if (variant) return variant.inventory_quantity > 0
  return (product.variants ?? []).some((v) => v.inventory_quantity > 0)
}

export function computeListingFacets(products: Product[]): ListingFacets {
  const tagMap = new Map<number, { name: string; count: number }>()
  const vendorMap = new Map<string, number>()
  const typeMap = new Map<string, number>()
  let extentMin = Infinity
  let extentMax = -Infinity

  for (const p of products) {
    const price = displayPrice(p)
    if (Number.isFinite(price)) {
      extentMin = Math.min(extentMin, price)
      extentMax = Math.max(extentMax, price)
    }
    for (const t of p.tags ?? []) {
      const row = tagMap.get(t.id) ?? { name: t.name, count: 0 }
      row.count += 1
      tagMap.set(t.id, row)
    }
    const vendor = p.vendor?.trim()
    if (vendor) vendorMap.set(vendor, (vendorMap.get(vendor) ?? 0) + 1)
    const ptype = p.product_type?.trim()
    if (ptype) typeMap.set(ptype, (typeMap.get(ptype) ?? 0) + 1)
  }

  const tags = [...tagMap.entries()]
    .map(([id, { name, count }]) => ({ id, name, count }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const vendors = [...vendorMap.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value))

  const productTypes = [...typeMap.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value))

  const priceExtent =
    extentMin === Infinity
      ? { min: 0, max: 0 }
      : { min: roundDown2(extentMin), max: roundUp2(extentMax) }

  return { tags, vendors, productTypes, priceExtent }
}

function roundDown2(n: number): number {
  return Math.floor(n * 100) / 100
}

function roundUp2(n: number): number {
  return Math.ceil(n * 100) / 100
}

function productMatchesSearchQuery(product: Product, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase()
  if (!q) return true

  const haystack = (s: string | null | undefined) => (s ?? '').toLowerCase()

  if (haystack(product.title).includes(q)) return true
  if (haystack(product.handle).includes(q)) return true
  if (haystack(product.vendor).includes(q)) return true
  if (haystack(product.product_type).includes(q)) return true
  if (haystack(product.description).includes(q)) return true

  for (const t of product.tags ?? []) {
    if (haystack(t.name).includes(q)) return true
  }

  for (const v of product.variants ?? []) {
    if (haystack(v.title).includes(q)) return true
    if (haystack(v.sku).includes(q)) return true
    if (haystack(v.barcode).includes(q)) return true
    for (const ov of v.option_values ?? []) {
      if (haystack(ov.value).includes(q)) return true
    }
  }

  return false
}

export function applyListingFilters(products: Product[], filters: ListingFilters): Product[] {
  let next = products

  if (filters.searchQuery.trim()) {
    next = next.filter((p) => productMatchesSearchQuery(p, filters.searchQuery))
  }

  if (filters.tagIds.length > 0) {
    const selected = new Set(filters.tagIds)
    next = next.filter((p) => (p.tags ?? []).some((t) => selected.has(t.id)))
  }

  if (filters.vendors.length > 0) {
    const selected = new Set(filters.vendors)
    next = next.filter((p) => {
      const v = p.vendor?.trim()
      return v ? selected.has(v) : false
    })
  }

  if (filters.productTypes.length > 0) {
    const selected = new Set(filters.productTypes)
    next = next.filter((p) => {
      const pt = p.product_type?.trim()
      return pt ? selected.has(pt) : false
    })
  }

  if (filters.minPrice != null) {
    next = next.filter((p) => displayPrice(p) >= filters.minPrice!)
  }
  if (filters.maxPrice != null) {
    next = next.filter((p) => displayPrice(p) <= filters.maxPrice!)
  }

  if (filters.inStockOnly) {
    next = next.filter(productInStock)
  }

  return next
}

export function sortListingProducts(products: Product[], sort: ListingSort): Product[] {
  const list = [...products]
  switch (sort) {
    case 'featured':
      return list
    case 'newest':
      return list.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
    case 'title-asc':
      return list.sort((a, b) => a.title.localeCompare(b.title))
    case 'price-asc':
      return list.sort((a, b) => displayPrice(a) - displayPrice(b))
    case 'price-desc':
      return list.sort((a, b) => displayPrice(b) - displayPrice(a))
  }
}

/** Parse comma-separated positive integers */
export function parseIdListParam(raw: string | null): number[] {
  if (raw == null || raw.trim() === '') return []
  return raw
    .split(',')
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n))
}

export function parseStringListParam(raw: string | null): string[] {
  if (raw == null || raw.trim() === '') return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function parsePriceParam(raw: string | null): number | null {
  if (raw == null || raw.trim() === '') return null
  const n = Number.parseFloat(raw)
  return Number.isFinite(n) ? n : null
}

export function parseSortParam(raw: string | null): ListingSort {
  const allowed: ListingSort[] = ['featured', 'price-asc', 'price-desc', 'newest', 'title-asc']
  if (raw && (allowed as string[]).includes(raw)) return raw as ListingSort
  return 'featured'
}

export function countActiveListingFilters(f: ListingFilters): number {
  let n = countFacetFilters(f)
  if (f.sort !== 'featured') n += 1
  return n
}

/** Facets only (exclude sort) — used for sidebar “filters” badges. */
export function countFacetFilters(f: ListingFilters): number {
  let n = 0
  if (f.searchQuery.trim()) n += 1
  if (f.tagIds.length) n += f.tagIds.length
  if (f.vendors.length) n += f.vendors.length
  if (f.productTypes.length) n += f.productTypes.length
  if (f.minPrice != null) n += 1
  if (f.maxPrice != null) n += 1
  if (f.inStockOnly) n += 1
  return n
}
