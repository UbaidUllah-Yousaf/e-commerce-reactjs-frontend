import { apiGet, apiGetOrNull } from './client'
import type { Collection, Product, SizeChartByTag } from '../types/catalog'
import { normalizeProductListPayload } from '../utils/catalog'

export type ProductsFetchMode = 'full' | 'cursor'

export interface ProductsCursorPage {
  mode: 'cursor'
  results: Product[]
  /** Opaque token from the API `next` link — send as `cursor` query param for the following page */
  nextCursor: string | null
  /** Opaque token from the API `previous` link — send as `cursor` to go back; `null` clears to first page */
  previousCursor: string | null
}

export interface ProductsFullList {
  mode: 'full'
  results: Product[]
}

export type ProductsListResponse = ProductsCursorPage | ProductsFullList

/**
 * Extract cursor query value from a DRF-style pagination URL (`?cursor=…`),
 * or treat a non-URL string as an opaque cursor if your API returns one.
 */
export function extractCursorFromLink(link: unknown): string | null {
  if (link == null || link === '') return null
  if (typeof link !== 'string') return null
  const trimmed = link.trim()
  if (!trimmed) return null
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://example.invalid'
    const url = trimmed.startsWith('http') ? new URL(trimmed) : new URL(trimmed, base)
    const c = url.searchParams.get('cursor')
    if (c) return c
  } catch {
    /* fall through */
  }
  if (!trimmed.includes('/') && !trimmed.includes('?')) {
    return trimmed
  }
  return null
}

function parseProductsListResponse(raw: unknown): ProductsListResponse {
  if (Array.isArray(raw)) {
    return { mode: 'full', results: normalizeProductListPayload(raw) }
  }

  if (raw && typeof raw === 'object' && 'results' in raw && Array.isArray((raw as { results: unknown }).results)) {
    const o = raw as { results: unknown[]; next?: unknown; previous?: unknown }
    const results = o.results as Product[]
    const hasCursorFields = 'next' in o || 'previous' in o
    if (hasCursorFields) {
      return {
        mode: 'cursor',
        results,
        nextCursor: extractCursorFromLink(o.next),
        previousCursor: extractCursorFromLink(o.previous),
      }
    }
    return { mode: 'full', results }
  }

  throw new Error('Unexpected products list response')
}

export interface FetchProductsListParams {
  pageSize: number
  /** Current page cursor (omit on first page). */
  cursor?: string | null
  /** When set, sent as `collection` — backend may scope results. */
  collectionId?: number | null
}

/**
 * `GET /products/?page_size=&cursor=&collection=`
 * - DRF CursorPagination: `next` / `previous` links drive cursors.
 * - Plain array / non-cursor `{ results }`: returns `mode: 'full'` for client-side paging.
 */
export async function fetchProductsList(params: FetchProductsListParams): Promise<ProductsListResponse> {
  const sp = new URLSearchParams()
  sp.set('page_size', String(params.pageSize))
  if (params.cursor) {
    sp.set('cursor', params.cursor)
  }
  if (params.collectionId != null) {
    sp.set('collection', String(params.collectionId))
  }
  const raw = await apiGet<unknown>(`/products/?${sp.toString()}`)
  return parseProductsListResponse(raw)
}

export async function fetchProduct(id: number): Promise<Product> {
  return apiGet<Product>(`/products/${id}/`)
}

/** `GET /size-charts/by-tag/?name=` — `null` when no chart exists for that tag (404). */
export async function fetchSizeChartByTag(tagName: string): Promise<SizeChartByTag | null> {
  const name = tagName.trim()
  if (!name) return null
  const sp = new URLSearchParams({ name })
  return apiGetOrNull<SizeChartByTag>(`/size-charts/by-tag/?${sp.toString()}`)
}

export async function fetchCollections(): Promise<Collection[]> {
  const raw = await apiGet<unknown>('/collections/')
  if (Array.isArray(raw)) {
    return raw as Collection[]
  }
  if (
    raw &&
    typeof raw === 'object' &&
    'results' in raw &&
    Array.isArray((raw as { results: unknown }).results)
  ) {
    return (raw as { results: Collection[] }).results
  }
  throw new Error('Unexpected collections list response')
}
