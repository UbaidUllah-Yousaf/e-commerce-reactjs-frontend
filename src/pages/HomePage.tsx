import { useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Button, Space, Spin, Row, Col, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { App as AntdApp } from 'antd'
import ProductCard from '../components/productCard'
import {
  buildProductCardVariantChoices,
  productCardCarouselDotCount,
  productCardDescriptionExcerpt,
  productCardShowNewBadge,
  productCardSubtitle,
} from '../utils/productCardData'
import type { ProductCardActionData } from '../components/ProductListingShop'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import { fetchProductsList } from '../api/catalog'
import {
  collectGalleryImages,
  getDefaultVariant,
  isProductShownOnStorefront,
  parseMoney,
} from '../utils/catalog'
import { getSafeImageSrc } from '../utils/image'
import { SHOP_COLLECTIONS_PATH, SHOP_PRODUCTS_PATH } from '../constants/storeRoutes'
import '../components/collectionsPage.css'
import './homePage.css'

const { Text } = Typography

/** First slice of the catalog on the home hero — matches largest PLP page size option. */
const HOME_CATALOG_PAGE_SIZE = 48 as const

export default function HomePage() {
  const { message } = AntdApp.useApp()
  const { state: cartState, dispatch: cartDispatch } = useCart()
  const { state: wishlistState, dispatch: wishlistDispatch } = useWishlist()

  const {
    data: listData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['products', 'home-preview', HOME_CATALOG_PAGE_SIZE],
    queryFn: () => fetchProductsList({ pageSize: HOME_CATALOG_PAGE_SIZE }),
    staleTime: 60 * 1000,
  })

  const visibleProducts = useMemo(() => {
    const raw = listData?.results ?? []
    return raw.filter(isProductShownOnStorefront).filter((p) => getDefaultVariant(p) != null)
  }, [listData])

  const cartVariantIds = useMemo(() => new Set(cartState.items.map((c) => c.id)), [cartState.items])
  const wishlistProductIds = useMemo(
    () => new Set(wishlistState.items.map((w) => w.id)),
    [wishlistState.items],
  )

  const handleAddToCart = useCallback(
    (product: ProductCardActionData) => {
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
      message.success({ content: `${product.name} added to bag`, duration: 2 })
    },
    [cartDispatch, message],
  )

  const handleWishlistToggle = useCallback(
    (item: ProductCardActionData) => {
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
    },
    [wishlistDispatch, wishlistState.items, message],
  )

  return (
    <div className="store-shell">
      <section className="hero-ella">
        <p className="hero-ella__eyebrow">New season</p>
        <h1 className="hero-ella__title">Quiet luxury, made to live in.</h1>
        <p className="hero-ella__subtitle">
          Refined silhouettes and honest materials — browse curated collections or explore the full catalog with
          filters, sort, and the layout that fits how you shop.
        </p>
        <Space size="middle" wrap justify="center">
          <Link to={SHOP_PRODUCTS_PATH}>
            <Button type="primary" size="large" className="hero-shop-btn">
              Shop all products
            </Button>
          </Link>
          <Link to={SHOP_COLLECTIONS_PATH}>
            <Button size="large" className="hero-browse-btn">
              View collections
            </Button>
          </Link>
        </Space>
      </section>

      <section className="home-catalog" aria-labelledby="home-catalog-heading">
        <div className="ella-section-head">
          <h2 id="home-catalog-heading" className="ella-section-title">
            Shop the catalog
          </h2>
          <Link to={SHOP_PRODUCTS_PATH} className="collections-page__back-products">
            View all products
          </Link>
        </div>
        <Text type="secondary" className="home-catalog__hint">
          {error
            ? 'Catalog could not be loaded. Open Shop all products when your API is available.'
            : `Showing products from your storefront (up to ${HOME_CATALOG_PAGE_SIZE} per load). Use filters and pagination on the products page for more.`}
        </Text>

        {isLoading ? (
          <div className="home-catalog__loading">
            <Spin size="large" />
          </div>
        ) : error ? null : visibleProducts.length === 0 ? (
          <Text type="secondary" className="home-catalog__hint">
            No published products yet — add inventory in your backend, then refresh.
          </Text>
        ) : (
          <Row gutter={[20, 28]} className="home-catalog__grid">
            {visibleProducts.map((product) => {
              const variant = getDefaultVariant(product)!
              const priceNum = parseMoney(variant.price)
              const compareAt = variant.compare_at_price ? parseMoney(variant.compare_at_price) : undefined
              const originalPrice = compareAt && compareAt > priceNum ? compareAt : undefined
              const totalStock = variant.inventory_quantity
              const gallery = collectGalleryImages(product, variant)
              const thumbnail = gallery[0]
              const isWishlisted = wishlistProductIds.has(product.id)
              const isInCart = cartVariantIds.has(variant.id)
              const homeVariantChoices = buildProductCardVariantChoices(product)

              return (
                <Col key={product.id} xs={24} sm={12} md={8} lg={8} xl={8}>
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
                    carouselDotCount={productCardCarouselDotCount(product, variant, homeVariantChoices?.length ?? 0)}
                    variantChoices={homeVariantChoices}
                    inStock={totalStock > 0}
                    isNew={productCardShowNewBadge(product)}
                    isWishlisted={isWishlisted}
                    isInCart={isInCart}
                    onAddToCart={handleAddToCart}
                    onWishlistToggle={handleWishlistToggle}
                  />
                </Col>
              )
            })}
          </Row>
        )}
      </section>
    </div>
  )
}
