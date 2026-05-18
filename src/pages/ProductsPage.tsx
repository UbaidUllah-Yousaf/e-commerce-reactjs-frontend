import { useMemo, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { App as AntdApp, Spin, Alert } from 'antd'
import {
  ProductListingShop,
  type ProductCardActionData,
  type ProductListingCursorPagination,
} from '../components/ProductListingShop'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import { fetchCollections, fetchProductsList } from '../api/catalog'
import { isProductShownOnStorefront, isCollectionListed } from '../utils/catalog'
import { SHOP_PRODUCTS_PATH } from '../constants/storeRoutes'

function scrollToListingTop() {
  requestAnimationFrame(() => {
    document.getElementById('products-shop')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

const PAGE_SIZE_OPTIONS = [12, 24, 36, 48] as const

function parsePageSize(raw: string | null): number {
  const n = raw != null ? Number.parseInt(raw, 10) : 24
  return PAGE_SIZE_OPTIONS.includes(n as (typeof PAGE_SIZE_OPTIONS)[number]) ? n : 24
}

export default function ProductsPage() {
  const { message } = AntdApp.useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const collectionParam = searchParams.get('collection')
  const cursorParam = searchParams.get('cursor')

  const collectionFilterId = useMemo(() => {
    const n = collectionParam != null ? Number.parseInt(collectionParam, 10) : Number.NaN
    return Number.isFinite(n) ? n : null
  }, [collectionParam])

  const pageSize = useMemo(() => parsePageSize(searchParams.get('per')), [searchParams])

  const { data: collections } = useQuery({
    queryKey: ['collections'],
    queryFn: fetchCollections,
    staleTime: 60 * 1000,
  })

  const activeCollectionMeta = collectionFilterId
    ? collections?.find((c) => c.id === collectionFilterId)
    : undefined

  useEffect(() => {
    if (collectionFilterId == null) return
    scrollToListingTop()
  }, [collectionFilterId])

  const {
    data: listData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['products', 'list', pageSize, cursorParam ?? '', collectionFilterId ?? 'all'],
    queryFn: () =>
      fetchProductsList({
        pageSize,
        cursor: cursorParam ?? undefined,
        collectionId: collectionFilterId,
      }),
  })

  const { state: cartState, dispatch: cartDispatch } = useCart()
  const { state: wishlistState, dispatch: wishlistDispatch } = useWishlist()

  const visibleProducts = useMemo(() => {
    const raw = listData?.results ?? []
    return raw.filter(isProductShownOnStorefront)
  }, [listData])

  const catalogCollections = useMemo(() => (collections ?? []).filter(isCollectionListed), [collections])

  const cartVariantIds = useMemo(
    () => new Set(cartState.items.map((c) => c.id)),
    [cartState.items],
  )

  const wishlistProductIds = useMemo(
    () => new Set(wishlistState.items.map((w) => w.id)),
    [wishlistState.items],
  )

  const handleNextPage = useCallback(() => {
    if (!listData || listData.mode !== 'cursor' || !listData.nextCursor) return
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.set('cursor', listData.nextCursor as string)
        return p
      },
      { replace: false },
    )
    scrollToListingTop()
  }, [listData, setSearchParams])

  const handlePreviousPage = useCallback(() => {
    if (!listData || listData.mode !== 'cursor') return
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (listData.previousCursor) {
          p.set('cursor', listData.previousCursor)
        } else {
          p.delete('cursor')
        }
        return p
      },
      { replace: false },
    )
    scrollToListingTop()
  }, [listData, setSearchParams])

  const cursorPagination: ProductListingCursorPagination = useMemo(() => {
    if (!listData || listData.mode !== 'cursor') {
      return {
        hasNextPage: false,
        hasPreviousPage: false,
        onNextPage: () => {},
        onPreviousPage: () => {},
      }
    }
    const hasNext = listData.nextCursor != null && listData.nextCursor !== ''
    const hasPrevious = Boolean(cursorParam) || Boolean(listData.previousCursor)
    return {
      hasNextPage: hasNext,
      hasPreviousPage: hasPrevious,
      onNextPage: handleNextPage,
      onPreviousPage: handlePreviousPage,
    }
  }, [listData, cursorParam, handleNextPage, handlePreviousPage])

  const handleAddToCart = (product: ProductCardActionData) => {
    cartDispatch({
      type: 'ADD_ITEM',
      payload: {
        id: product.variantId,
        productId: product.productId,
        title: product.name,
        price: product.price,
        image: product.image,
      },
    })
    message.success({
      content: `${product.name} added to bag`,
      duration: 2,
    })
  }

  const handleWishlistToggle = (item: ProductCardActionData) => {
    wishlistDispatch({
      type: 'TOGGLE_ITEM',
      payload: {
        id: item.productId,
        variantId: item.variantId,
        title: item.name,
        price: item.price,
        image: item.image,
      },
    })
    const action = wishlistState.items.some((w) => w.id === item.productId)
      ? 'removed from'
      : 'added to'

    message.open({
      content: `${item.name} ${action} wishlist`,
      duration: 2,
    })
  }

  if (isLoading) {
    return (
      <div className="store-shell" style={{ paddingTop: '2.5rem', paddingBottom: '4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
          <Spin size="large" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="store-shell" style={{ padding: '2rem 0' }}>
        <Alert
          message="We couldn’t load the catalog"
          description={error instanceof Error ? error.message : 'Check the API / VITE_API_ORIGIN in .env.'}
          type="error"
          showIcon
        />
      </div>
    )
  }

  return (
    <div className="store-shell store-shell--plp">
      <ProductListingShop
        storefrontProducts={visibleProducts}
        collections={catalogCollections}
        collectionFilterId={collectionFilterId}
        activeCollectionMeta={activeCollectionMeta}
        scrollAnchorId="products-shop"
        productsBasePath={SHOP_PRODUCTS_PATH}
        cursorPagination={cursorPagination}
        onAddToCart={handleAddToCart}
        onWishlistToggle={handleWishlistToggle}
        cartVariantIds={cartVariantIds}
        wishlistProductIds={wishlistProductIds}
      />
    </div>
  )
}
