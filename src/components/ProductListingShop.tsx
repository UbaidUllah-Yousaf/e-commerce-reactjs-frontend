import { useMemo, useState, useCallback, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Row,
  Col,
  Typography,
  Select,
  Checkbox,
  Drawer,
  Button,
  Badge,
  Empty,
  Slider,
  Collapse,
  Input,
} from 'antd'
import type { CheckboxChangeEvent } from 'antd/es/checkbox'
import {
  FilterOutlined,
  SortAscendingOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  LeftOutlined,
  RightOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import type { Collection, Product } from '../types/catalog'
import ProductCard, { type ProductCardActionData } from './productCard'
import { ProductListRow } from './ProductListRow'
import { getSafeImageSrc } from '../utils/image'
import {
  collectGalleryImages,
  filterProductsByCollection,
  getDefaultVariant,
  parseMoney,
} from '../utils/catalog'
import {
  type ListingFilters,
  applyListingFilters,
  computeListingFacets,
  countFacetFilters,
  DEFAULT_LISTING_FILTERS,
  parseIdListParam,
  parsePriceParam,
  parseSortParam,
  parseStringListParam,
  sortListingProducts,
  type ListingSort,
} from '../utils/listingFilters'
import { storeNavigation } from '../config/navigation'
import { ListingBanners } from './ListingBanners'
import { PlpDensityIcon } from './plpDensityIcons'
import { SHOP_PRODUCTS_PATH } from '../constants/storeRoutes'
import {
  buildProductCardVariantChoices,
  productCardCarouselDotCount,
  productCardDescriptionExcerpt,
  productCardShowNewBadge,
  productCardSubtitle,
} from '../utils/productCardData'
import './productListingShop.css'

export type { ProductCardActionData }

const { Text } = Typography

const FACET_PARAM_KEYS = ['tags', 'vendors', 'ptypes', 'min', 'max', 'instock'] as const

const PAGE_SIZES = [12, 24, 36, 48] as const

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi)
}

/** Keep price range handles inside facet extent and ordered low → high. */
function clampPriceRange(
  minVal: number,
  maxVal: number,
  extentMin: number,
  extentMax: number,
): [number, number] {
  let a = clamp(minVal, extentMin, extentMax)
  let b = clamp(maxVal, extentMin, extentMax)
  if (a > b) {
    ;[a, b] = [b, a]
  }
  return [a, b]
}

function readListingFilters(searchParams: URLSearchParams): ListingFilters {
  return {
    searchQuery: searchParams.get('q') ?? '',
    tagIds: parseIdListParam(searchParams.get('tags')),
    vendors: parseStringListParam(searchParams.get('vendors')),
    productTypes: parseStringListParam(searchParams.get('ptypes')),
    minPrice: parsePriceParam(searchParams.get('min')),
    maxPrice: parsePriceParam(searchParams.get('max')),
    inStockOnly: searchParams.get('instock') === '1',
    sort: parseSortParam(searchParams.get('sort')),
  }
}

function writeListingFilters(params: URLSearchParams, filters: ListingFilters): void {
  const setOrDel = (key: string, value: string | null) => {
    if (value == null || value === '') params.delete(key)
    else params.set(key, value)
  }

  setOrDel('q', filters.searchQuery.trim() ? filters.searchQuery.trim() : null)
  setOrDel('tags', filters.tagIds.length ? filters.tagIds.join(',') : null)
  setOrDel('vendors', filters.vendors.length ? filters.vendors.join(',') : null)
  setOrDel('ptypes', filters.productTypes.length ? filters.productTypes.join(',') : null)
  setOrDel('min', filters.minPrice != null ? String(filters.minPrice) : null)
  setOrDel('max', filters.maxPrice != null ? String(filters.maxPrice) : null)
  setOrDel('instock', filters.inStockOnly ? '1' : null)
  setOrDel('sort', filters.sort !== 'featured' ? filters.sort : null)
}

function parsePerParam(raw: string | null): number {
  const n = raw != null ? Number.parseInt(raw, 10) : 24
  return PAGE_SIZES.includes(n as (typeof PAGE_SIZES)[number]) ? n : 24
}

function parseColsParam(raw: string | null): 2 | 3 | 4 {
  const n = raw != null ? Number.parseInt(raw, 10) : 3
  if (n === 2 || n === 4) return n
  return 3
}

function parseViewParam(raw: string | null): 'grid' | 'list' {
  return raw === 'list' ? 'list' : 'grid'
}

/** Server-backed cursor paging (DRF CursorPagination-style `next` / `previous` links). */
export interface ProductListingCursorPagination {
  hasNextPage: boolean
  hasPreviousPage: boolean
  onNextPage: () => void
  onPreviousPage: () => void
}

interface ProductListingShopProps {
  storefrontProducts: Product[]
  collections: Collection[]
  collectionFilterId: number | null
  activeCollectionMeta: Collection | undefined
  scrollAnchorId?: string
  /** Base path for PLP links in breadcrumbs (e.g. `/products`) */
  productsBasePath?: string
  /** Prev/Next + URL `cursor` on the storefront; pass no-op handlers when the API returns a single bundle */
  cursorPagination: ProductListingCursorPagination
  onAddToCart: (product: ProductCardActionData) => void
  onWishlistToggle: (product: ProductCardActionData) => void
  cartVariantIds: Set<number>
  wishlistProductIds: Set<number>
}

function colSpansForGrid(cols: 2 | 3 | 4): { xs: number; sm: number; md: number; lg: number; xl: number } {
  if (cols === 2) return { xs: 24, sm: 12, md: 12, lg: 12, xl: 12 }
  if (cols === 4) return { xs: 24, sm: 12, md: 6, lg: 6, xl: 6 }
  /* 3-col default: one column on small phones, two from sm, three from md */
  return { xs: 24, sm: 12, md: 8, lg: 8, xl: 8 }
}

export function ProductListingShop({
  storefrontProducts,
  collections,
  collectionFilterId,
  activeCollectionMeta,
  scrollAnchorId = 'products-shop',
  productsBasePath = SHOP_PRODUCTS_PATH,
  cursorPagination,
  onAddToCart,
  onWishlistToggle,
  cartVariantIds,
  wishlistProductIds,
}: ProductListingShopProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  /** Controlled range Slider needs live updates while dragging; URL/listingFilters update only on release. */
  const [priceSliderDraft, setPriceSliderDraft] = useState<[number, number] | null>(null)

  const listingFilters = useMemo(() => readListingFilters(searchParams), [searchParams])
  const pageSize = useMemo(() => parsePerParam(searchParams.get('per')), [searchParams])
  const gridCols = useMemo(() => parseColsParam(searchParams.get('cols')), [searchParams])
  const viewMode = useMemo(() => parseViewParam(searchParams.get('view')), [searchParams])

  const colSpans = useMemo(() => colSpansForGrid(gridCols), [gridCols])

  const scopedProducts = useMemo(
    () => filterProductsByCollection(storefrontProducts, collectionFilterId),
    [storefrontProducts, collectionFilterId],
  )

  const facets = useMemo(() => computeListingFacets(scopedProducts), [scopedProducts])

  const mergeListing = useCallback(
    (patch: Partial<ListingFilters>) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          const merged: ListingFilters = { ...readListingFilters(p), ...patch }
          writeListingFilters(p, merged)
          p.delete('page')
          p.delete('cursor')
          return p
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const filteredProducts = useMemo(() => {
    const pipe = applyListingFilters(scopedProducts, listingFilters)
    return sortListingProducts(pipe, listingFilters.sort)
  }, [scopedProducts, listingFilters])

  const totalFiltered = filteredProducts.length

  useEffect(() => {
    const pageRaw = searchParams.get('page')
    if (!pageRaw) return
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.delete('page')
        return p
      },
      { replace: true },
    )
  }, [searchParams, setSearchParams])

  const facetFilterCount = countFacetFilters(listingFilters)

  const setCollectionId = useCallback(
    (id: number | null) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          if (id == null) p.delete('collection')
          else p.set('collection', String(id))
          for (const k of FACET_PARAM_KEYS) p.delete(k)
          p.delete('page')
          p.delete('cursor')
          return p
        },
        { replace: true },
      )
      requestAnimationFrame(() =>
        document.getElementById(scrollAnchorId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      )
    },
    [setSearchParams, scrollAnchorId],
  )

  const setPageLimit = useCallback(
    (nextSize: number) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          if (nextSize === 24) p.delete('per')
          else if (PAGE_SIZES.includes(nextSize as (typeof PAGE_SIZES)[number])) {
            p.set('per', String(nextSize))
          }
          p.delete('page')
          p.delete('cursor')
          return p
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const setCols = useCallback(
    (cols: 2 | 3 | 4) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          if (cols === 3) p.delete('cols')
          else p.set('cols', String(cols))
          return p
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const setViewMode = useCallback(
    (mode: 'grid' | 'list') => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          if (mode === 'grid') p.delete('view')
          else p.set('view', 'list')
          p.delete('page')
          p.delete('cursor')
          return p
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const clearSidebarFilters = useCallback(() => {
    mergeListing(DEFAULT_LISTING_FILTERS)
  }, [mergeListing])

  const clearCollection = useCallback(() => {
    setCollectionId(null)
  }, [setCollectionId])

  const priceSliderRange = useMemo((): [number, number] => {
    const { min, max } = facets.priceExtent
    return max > min ? [min, max] : [0, 500]
  }, [facets.priceExtent.min, facets.priceExtent.max])

  const priceSliderCommitted = useMemo(
    () =>
      clampPriceRange(
        listingFilters.minPrice ?? priceSliderRange[0],
        listingFilters.maxPrice ?? priceSliderRange[1],
        priceSliderRange[0],
        priceSliderRange[1],
      ),
    [listingFilters.minPrice, listingFilters.maxPrice, priceSliderRange[0], priceSliderRange[1]],
  )

  const priceSliderValue = priceSliderDraft ?? priceSliderCommitted

  useEffect(() => {
    setPriceSliderDraft(null)
  }, [listingFilters.minPrice, listingFilters.maxPrice, priceSliderRange[0], priceSliderRange[1]])

  const onPriceSliderChange = (vals: number[]) => {
    if (vals.length < 2) return
    const lo = Math.round(vals[0]!)
    const hi = Math.round(vals[1]!)
    const rMin = priceSliderRange[0]
    const rMax = priceSliderRange[1]
    const atMin = lo <= rMin
    const atMax = hi >= rMax
    mergeListing({
      minPrice: atMin ? null : lo,
      maxPrice: atMax ? null : hi,
    })
  }

  const toggleTag = (tagId: number, checked: boolean) => {
    const set = new Set(listingFilters.tagIds)
    if (checked) set.add(tagId)
    else set.delete(tagId)
    mergeListing({ tagIds: [...set] })
  }

  const toggleVendor = (value: string, checked: boolean) => {
    const set = new Set(listingFilters.vendors)
    if (checked) set.add(value)
    else set.delete(value)
    mergeListing({ vendors: [...set] })
  }

  const toggleProductType = (value: string, checked: boolean) => {
    const set = new Set(listingFilters.productTypes)
    if (checked) set.add(value)
    else set.delete(value)
    mergeListing({ productTypes: [...set] })
  }

  const sortOptions: { value: ListingSort; label: string }[] = [
    { value: 'featured', label: 'Featured' },
    { value: 'newest', label: 'Newest' },
    { value: 'price-asc', label: 'Price, low to high' },
    { value: 'price-desc', label: 'Price, high to low' },
    { value: 'title-asc', label: 'Alphabetically, A–Z' },
  ]

  const catalogSearchInput = (
    <Input.Search
      className="ella-plp-search"
      placeholder="Search products…"
      value={listingFilters.searchQuery}
      allowClear
      enterButton={<SearchOutlined aria-hidden />}
      onChange={(e) => mergeListing({ searchQuery: e.target.value })}
      onSearch={(v) => mergeListing({ searchQuery: (v ?? '').trim() })}
    />
  )

  const showingLabel =
    totalFiltered === 0
      ? 'No matches on this page'
      : `Showing ${totalFiltered} ${totalFiltered === 1 ? 'product' : 'products'} on this page`

  const renderFilterBody = (showRailIntro: boolean) => (
    <div
      className={`ella-plp-filter-surface${showRailIntro ? '' : ' ella-plp-filter-surface--drawer'}`}
    >
      {showRailIntro ? (
        <header className="ella-plp-sidebar-header">
          <h2 className="ella-plp-sidebar-title">Refine</h2>
          <p className="ella-plp-sidebar-lede">
            Narrow by collection, product traits, availability, and price.
          </p>
        </header>
      ) : (
        <p className="ella-plp-drawer-filter-lede">
          Narrow results by collection and attributes below.
        </p>
      )}

      <div className="ella-plp-sidebar__block ella-plp-search-block">
        <p className="ella-plp-filter-heading">Search</p>
        {catalogSearchInput}
      </div>

      <div className="ella-plp-sidebar__block">
        <p className="ella-plp-filter-heading">Collections</p>
        <div className="ella-plp-collection-links">
          <button
            type="button"
            className={`ella-plp-collection-pill ${collectionFilterId == null ? 'ella-plp-collection-pill--active' : ''}`}
            onClick={() => setCollectionId(null)}
          >
            Shop all
          </button>
          {collections.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`ella-plp-collection-pill ${collectionFilterId === c.id ? 'ella-plp-collection-pill--active' : ''}`}
              onClick={() => setCollectionId(c.id)}
            >
              {c.title}
              <span className="ella-plp-collection-pill__count">{c.products_count}</span>
            </button>
          ))}
        </div>
      </div>

      {facets.productTypes.length > 0 ? (
        <Collapse
          ghost
          expandIconPosition="end"
          className="ella-plp-filter-collapse"
          defaultActiveKey={['type']}
          items={[
            {
              key: 'type',
              label: <span className="ella-plp-filter-heading-inline">Product type</span>,
              children: (
                <div className="ella-plp-checkbox-stack">
                  {facets.productTypes.map((row) => (
                    <Checkbox
                      key={row.value}
                      checked={listingFilters.productTypes.includes(row.value)}
                      onChange={(e: CheckboxChangeEvent) =>
                        toggleProductType(row.value, e.target.checked)
                      }
                    >
                      <span className="ella-plp-facet-label">
                        {row.value}
                        <span className="ella-plp-facet-count">{row.count}</span>
                      </span>
                    </Checkbox>
                  ))}
                </div>
              ),
            },
          ]}
        />
      ) : null}

      {facets.vendors.length > 0 ? (
        <Collapse
          ghost
          expandIconPosition="end"
          className="ella-plp-filter-collapse"
          defaultActiveKey={['vendor']}
          items={[
            {
              key: 'vendor',
              label: <span className="ella-plp-filter-heading-inline">Vendor</span>,
              children: (
                <div className="ella-plp-checkbox-stack">
                  {facets.vendors.map((row) => (
                    <Checkbox
                      key={row.value}
                      checked={listingFilters.vendors.includes(row.value)}
                      onChange={(e: CheckboxChangeEvent) => toggleVendor(row.value, e.target.checked)}
                    >
                      <span className="ella-plp-facet-label">
                        {row.value}
                        <span className="ella-plp-facet-count">{row.count}</span>
                      </span>
                    </Checkbox>
                  ))}
                </div>
              ),
            },
          ]}
        />
      ) : null}

      {facets.tags.length > 0 ? (
        <Collapse
          ghost
          expandIconPosition="end"
          className="ella-plp-filter-collapse"
          defaultActiveKey={['tags']}
          items={[
            {
              key: 'tags',
              label: <span className="ella-plp-filter-heading-inline">Tags</span>,
              children: (
                <div className="ella-plp-checkbox-stack">
                  {facets.tags.map((row) => (
                    <Checkbox
                      key={row.id}
                      checked={listingFilters.tagIds.includes(row.id)}
                      onChange={(e: CheckboxChangeEvent) => toggleTag(row.id, e.target.checked)}
                    >
                      <span className="ella-plp-facet-label">
                        {row.name}
                        <span className="ella-plp-facet-count">{row.count}</span>
                      </span>
                    </Checkbox>
                  ))}
                </div>
              ),
            },
          ]}
        />
      ) : null}

      <div className="ella-plp-sidebar__block">
        <p className="ella-plp-filter-heading">Price</p>
        {facets.priceExtent.max > facets.priceExtent.min ? (
          <div className="ella-plp-price-slider-wrap">
            <Slider
              range
              min={priceSliderRange[0]}
              max={priceSliderRange[1]}
              step={1}
              value={priceSliderValue}
              onChange={(vals) => setPriceSliderDraft(clampPriceRange(vals[0]!, vals[1]!, priceSliderRange[0], priceSliderRange[1]))}
              onChangeComplete={(vals) => {
                setPriceSliderDraft(null)
                onPriceSliderChange(vals as number[])
              }}
              className="ella-plp-price-slider"
              tooltip={{ formatter: (v) => `$${Number(v).toFixed(0)}` }}
            />
            <div className="ella-plp-price-slider-values" aria-live="polite">
              <span>${priceSliderValue[0].toFixed(0)}</span>
              <span>${priceSliderValue[1].toFixed(0)}</span>
            </div>
          </div>
        ) : (
          <Text type="secondary" className="ella-plp-filter-muted">
            No price range yet.
          </Text>
        )}
      </div>

      <div className="ella-plp-sidebar__block ella-plp-stock-block">
        <p className="ella-plp-filter-heading">Availability</p>
        <Checkbox
          className="ella-plp-stock-checkbox"
          checked={listingFilters.inStockOnly}
          onChange={(e: CheckboxChangeEvent) => mergeListing({ inStockOnly: e.target.checked })}
        >
          In stock only
        </Checkbox>
      </div>

      {facetFilterCount > 0 ? (
        <button type="button" className="ella-plp-clear-filters" onClick={clearSidebarFilters}>
          Clear filters
        </button>
      ) : null}
    </div>
  )

  const sortControl = (
    <div className="ella-plp-sort-field">
      <span className="ella-plp-sort-field__label">
        <SortAscendingOutlined className="ella-plp-sort-field__label-icon" aria-hidden />
        Sort by
      </span>
      <Select<ListingSort>
        popupClassName="ella-plp-select-dropdown"
        className="ella-plp-sort-select"
        value={listingFilters.sort}
        placement="bottomRight"
        suffixIcon={<span className="ella-plp-sort-chevron" />}
        options={sortOptions.map((o) => ({ label: o.label, value: o.value }))}
        onChange={(value) => mergeListing({ sort: value })}
      />
    </div>
  )

  const pageLimitControl = (
    <div className="ella-plp-limit-field">
      <span className="ella-plp-limit-field__label">Per page</span>
      <Select<number>
        popupClassName="ella-plp-select-dropdown"
        className="ella-plp-limit-select"
        value={pageSize}
        placement="bottomRight"
        suffixIcon={<span className="ella-plp-sort-chevron" />}
        options={[...PAGE_SIZES.map((n) => ({ label: String(n), value: n }))]}
        onChange={(v) => setPageLimit(v)}
      />
    </div>
  )

  const cursorNav =
    totalFiltered > 0 ? (
      <div className="ella-plp-cursor-nav">
        <Button
          type="default"
          className="ella-plp-cursor-nav__btn"
          icon={<LeftOutlined />}
          disabled={!cursorPagination.hasPreviousPage}
          onClick={() => cursorPagination.onPreviousPage()}
        >
          Previous
        </Button>
        <Button
          type="default"
          className="ella-plp-cursor-nav__btn"
          disabled={!cursorPagination.hasNextPage}
          icon={<RightOutlined />}
          iconPosition="end"
          onClick={() => cursorPagination.onNextPage()}
        >
          Next
        </Button>
      </div>
    ) : null

  const viewToggle = (
    <div className="ella-plp-view-toggle" role="group" aria-label="Layout">
      <button
        type="button"
        className={`ella-plp-view-btn ${viewMode === 'grid' ? 'ella-plp-view-btn--active' : ''}`}
        aria-pressed={viewMode === 'grid'}
        aria-label="Grid layout"
        onClick={() => setViewMode('grid')}
      >
        <AppstoreOutlined />
      </button>
      <button
        type="button"
        className={`ella-plp-view-btn ${viewMode === 'list' ? 'ella-plp-view-btn--active' : ''}`}
        aria-pressed={viewMode === 'list'}
        aria-label="List layout"
        onClick={() => setViewMode('list')}
      >
        <UnorderedListOutlined />
      </button>
    </div>
  )

  const gridDensity =
    viewMode === 'grid' ? (
      <div className="ella-plp-grid-density" role="group" aria-label="Columns">
        <span className="ella-plp-grid-density__label">Columns</span>
        {([2, 3, 4] as const).map((c) => (
          <button
            key={c}
            type="button"
            className={`ella-plp-grid-density__btn ella-plp-grid-density__btn--icon ${gridCols === c ? 'ella-plp-grid-density__btn--active' : ''}`}
            aria-pressed={gridCols === c}
            aria-label={`${c} columns`}
            onClick={() => setCols(c)}
          >
            <PlpDensityIcon cols={c} />
          </button>
        ))}
      </div>
    ) : null

  return (
    <div id={scrollAnchorId} className="ella-plp ella-products-region">
      <div className="ella-plp-toolbar ella-plp-toolbar--mobile">
        <Badge count={facetFilterCount} size="small" offset={[0, 0]}>
          <Button icon={<FilterOutlined />} className="ella-plp-filter-btn" onClick={() => setFilterDrawerOpen(true)}>
            Filters
          </Button>
        </Badge>
        <div className="ella-plp-toolbar-mobile-right">
          {viewToggle}
          {viewMode === 'grid' ? gridDensity : null}
          {sortControl}
        </div>
      </div>

      <div className="ella-plp-layout">
        <aside className="ella-plp-sidebar ella-plp-sidebar--desktop" aria-label="Filters">
          {renderFilterBody(true)}
        </aside>

        <div className="ella-plp-main">
          <header className="ella-plp-header">
            <nav className="ella-plp-breadcrumb" aria-label="Breadcrumb">
              <Link to="/">Home</Link>
              <span className="ella-plp-breadcrumb-sep" aria-hidden>
                /
              </span>
              <Link to={productsBasePath}>Products</Link>
              {collectionFilterId != null ? (
                <>
                  <span className="ella-plp-breadcrumb-sep" aria-hidden>
                    /
                  </span>
                  <span className="ella-plp-breadcrumb-current">{activeCollectionMeta?.title ?? 'Collection'}</span>
                </>
              ) : null}
            </nav>

            <div className="ella-plp-search-wrap">{catalogSearchInput}</div>

            <div className="ella-plp-header-row ella-plp-header-row--split">
              <div className="ella-plp-header-copy">
                <h2 className="ella-plp-title">
                  {collectionFilterId != null
                    ? activeCollectionMeta?.title ?? 'Collection'
                    : 'All products'}
                </h2>
              </div>
              <div className="ella-plp-header-toolstrip ella-plp-toolbar--desktop">
                {viewToggle}
                {gridDensity}
                {sortControl}
              </div>
            </div>
          </header>

          <ListingBanners banners={storeNavigation.listingBanners ?? []} />

          <div className="ella-plp-controls-bar">
            <Text type="secondary" className="ella-plp-controls-bar__counts">
              {showingLabel}
            </Text>
          </div>

          {totalFiltered > 0 ? (
            viewMode === 'list' ? (
              <div className="ella-plp-list-stack">
                {filteredProducts.map((product) => {
                  const variant = getDefaultVariant(product)
                  const priceNum = variant ? parseMoney(variant.price) : parseMoney(product.min_price)
                  const compareAt = variant?.compare_at_price ? parseMoney(variant.compare_at_price) : undefined
                  const originalPrice = compareAt && compareAt > priceNum ? compareAt : undefined
                  const totalStock =
                    variant != null
                      ? variant.inventory_quantity
                      : (product.variants ?? []).reduce((s, v) => s + v.inventory_quantity, 0)
                  const gallery = collectGalleryImages(product, variant)
                  const thumbnail = gallery[0]
                  const isWishlisted = wishlistProductIds.has(product.id)
                  const isInCart = variant ? cartVariantIds.has(variant.id) : false

                  if (!variant) return null

                  return (
                    <ProductListRow
                      key={product.id}
                      productId={product.id}
                      variantId={variant.id}
                      image={getSafeImageSrc(thumbnail, product.featured_image)}
                      name={product.title}
                      price={priceNum}
                      originalPrice={originalPrice}
                      inStock={totalStock > 0}
                      isWishlisted={isWishlisted}
                      isInCart={isInCart}
                      onAddToCart={onAddToCart}
                      onWishlistToggle={onWishlistToggle}
                    />
                  )
                })}
              </div>
            ) : (
              <Row gutter={[20, 28]} className="ella-plp-grid">
                {filteredProducts.map((product) => {
                  const variant = getDefaultVariant(product)
                  const priceNum = variant ? parseMoney(variant.price) : parseMoney(product.min_price)
                  const compareAt = variant?.compare_at_price ? parseMoney(variant.compare_at_price) : undefined
                  const originalPrice = compareAt && compareAt > priceNum ? compareAt : undefined
                  const totalStock =
                    variant != null
                      ? variant.inventory_quantity
                      : (product.variants ?? []).reduce((s, v) => s + v.inventory_quantity, 0)
                  const gallery = collectGalleryImages(product, variant)
                  const thumbnail = gallery[0]
                  const isWishlisted = wishlistProductIds.has(product.id)
                  const isInCart = variant ? cartVariantIds.has(variant.id) : false

                  if (!variant) {
                    return (
                      <Col key={product.id} xs={24} sm={12} md={12} xl={8}>
                        <Empty
                          description={`${product.title} — no purchasable variant`}
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                      </Col>
                    )
                  }

                  const variantChoicesGrid = buildProductCardVariantChoices(product)

                  return (
                    <Col key={product.id} {...colSpans}>
                      <ProductCard
                        id={product.id}
                        variantId={variant.id}
                        image={getSafeImageSrc(thumbnail, product.featured_image)}
                        name={product.title}
                        price={priceNum}
                        originalPrice={originalPrice}
                        brand={product.vendor?.trim() || undefined}
                        subtitle={productCardSubtitle(product)}
                        description={productCardDescriptionExcerpt(product)}
                        carouselDotCount={productCardCarouselDotCount(product, variant, variantChoicesGrid?.length ?? 0)}
                        variantChoices={variantChoicesGrid}
                        inStock={totalStock > 0}
                        isNew={productCardShowNewBadge(product)}
                        isWishlisted={isWishlisted}
                        isInCart={isInCart}
                        onAddToCart={onAddToCart}
                        onWishlistToggle={onWishlistToggle}
                      />
                    </Col>
                  )
                })}
              </Row>
            )
          ) : null}

          {filteredProducts.length === 0 ? (
            <Empty
              className="ella-plp-empty"
              description={
                listingFilters.searchQuery.trim()
                  ? `No products match “${listingFilters.searchQuery.trim()}”${
                      collectionFilterId != null ? ' in this collection' : ''
                    }.`
                  : collectionFilterId != null
                    ? 'No products match these filters in this collection.'
                    : 'No products match these filters.'
              }
            >
              <Button type="primary" className="hero-shop-btn" onClick={clearSidebarFilters}>
                Clear filters
              </Button>
              {collectionFilterId != null ? (
                <Button className="hero-browse-btn" style={{ marginLeft: 12 }} onClick={clearCollection}>
                  View all products
                </Button>
              ) : null}
            </Empty>
          ) : (
            <div className="ella-plp-pagination-footer">
              <div className="ella-plp-pagination-footer__inner">
                <div className="ella-plp-pagination-footer__nav">{cursorNav}</div>
                <div className="ella-plp-pagination-footer__limit">{pageLimitControl}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Drawer
        title={<span className="ella-plp-drawer-title">Refine</span>}
        placement="left"
        className="ella-plp-filter-drawer"
        width="min(100%, 400px)"
        styles={{ body: { paddingTop: 4 } }}
        onClose={() => setFilterDrawerOpen(false)}
        open={filterDrawerOpen}
      >
        {renderFilterBody(false)}
      </Drawer>
    </div>
  )
}
