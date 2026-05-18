import { useState, useEffect, useMemo, useCallback } from 'react'
import { useQuery, useQueries } from '@tanstack/react-query'
import { useParams, Link, createSearchParams } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import { fetchProduct, fetchCollections, fetchSizeChartByTag } from '../api/catalog'
import {
  collectGalleryImages,
  findVariantByValueIds,
  getDefaultVariant,
  initialOptionSelections,
  parseMoney,
  resolveCollectionPresentation,
  selectionRecordToSortedValueIds,
} from '../utils/catalog'
import {
  App as AntdApp,
  Card,
  Button,
  Space,
  Spin,
  Alert,
  Typography,
  InputNumber,
  Collapse,
} from 'antd'
import { ShoppingCartOutlined, HeartOutlined } from '@ant-design/icons'
import { getSafeImageSrc, handleImageError } from '../utils/image'
import { SHOP_PRODUCTS_PATH } from '../constants/storeRoutes'
import { SizeChartTable } from './SizeChartTable'
import { SizeFitAssistant } from './SizeFitAssistant'
import './productDetail.css'
import './productDetail.ella.css'

const { Title, Text, Paragraph } = Typography

const ProductDetail = () => {
  const { message } = AntdApp.useApp()
  const { id } = useParams<{ id: string }>()
  const productId = id != null ? Number.parseInt(id, 10) : Number.NaN
  const { dispatch: cartDispatch } = useCart()
  const { state: wishlistState, dispatch: wishlistDispatch } = useWishlist()
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState<string>('')
  const [selection, setSelection] = useState<Record<number, number>>({})

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => fetchProduct(productId),
    enabled: Number.isFinite(productId),
  })

  const { data: collectionsCatalog } = useQuery({
    queryKey: ['collections'],
    queryFn: fetchCollections,
    staleTime: 60 * 1000,
  })

  const tagNames = useMemo(
    () => (product?.tags ?? []).map((t) => t.name.trim()).filter(Boolean),
    [product],
  )

  const sizeChartQueries = useQueries({
    queries: tagNames.map((name) => ({
      queryKey: ['sizeChartByTag', name] as const,
      queryFn: () => fetchSizeChartByTag(name),
      enabled: Boolean(product) && tagNames.length > 0,
      staleTime: 10 * 60 * 1000,
    })),
  })

  const sizeChart = useMemo(() => {
    for (const q of sizeChartQueries) {
      if (q.data) return q.data
    }
    return null
  }, [sizeChartQueries])

  const sizeChartBusy = sizeChartQueries.some((q) => q.isPending || q.isFetching)

  const defaultVariant = product ? getDefaultVariant(product) : null

  useEffect(() => {
    if (!product) return
    const dv = getDefaultVariant(product)
    setSelection(initialOptionSelections(product, dv))
    setQuantity(1)
  }, [product])

  const matchedVariant = useMemo(() => {
    if (!product) return null
    const options = product.options ?? []
    const variants = product.variants ?? []
    if (options.length === 0) {
      return variants[0] ?? null
    }
    const ids = selectionRecordToSortedValueIds(selection)
    return findVariantByValueIds(product, ids) ?? null
  }, [product, selection])

  const gallery = useMemo(() => {
    if (!product) return []
    const v = matchedVariant ?? defaultVariant
    return collectGalleryImages(product, v)
  }, [product, matchedVariant, defaultVariant])

  useEffect(() => {
    if (gallery.length > 0) {
      setSelectedImage(gallery[0])
    }
  }, [gallery])

  const priceNum = matchedVariant ? parseMoney(matchedVariant.price) : 0
  const compareAt = matchedVariant?.compare_at_price
    ? parseMoney(matchedVariant.compare_at_price)
    : undefined
  const originalPrice =
    compareAt !== undefined && compareAt > priceNum ? compareAt : undefined
  const discount =
    originalPrice !== undefined
      ? Math.round(((originalPrice - priceNum) / originalPrice) * 100)
      : 0
  const inventory = matchedVariant?.inventory_quantity ?? 0
  const hasInvalidCombo = Boolean((product?.options?.length ?? 0) > 0 && !matchedVariant)

  const applySuggestedSize = useCallback(
    (optionId: number, valueId: number) => {
      setSelection((prev) => ({ ...prev, [optionId]: valueId }))
      setQuantity(1)
      message.success('Size updated')
    },
    [message],
  )

  const collapseItems = useMemo(() => {
    if (!product) return []

    const showSizeGuide = (product.tags?.length ?? 0) > 0 && (sizeChartBusy || sizeChart)

    const sizeGuidePanel = showSizeGuide
      ? [
          {
            key: 'size',
            label: 'Size guide',
            children: (
              <div className="ella-pdp-accordion-inner">
                {sizeChartBusy && !sizeChart ? (
                  <div className="ella-size-chart-loading">
                    <Spin size="small" />
                  </div>
                ) : sizeChart ? (
                  <>
                    <Paragraph className="ella-pdp-copy" style={{ marginBottom: 12 }}>
                      {sizeChart.title}
                    </Paragraph>
                    <SizeChartTable chart={sizeChart} />
                    <SizeFitAssistant
                      chart={sizeChart}
                      product={product}
                      selection={selection}
                      onApplySize={applySuggestedSize}
                    />
                  </>
                ) : null}
              </div>
            ),
          },
        ]
      : []

    return [
      ...sizeGuidePanel,
      {
        key: 'desc',
        label: 'Description & details',
        children: (
          <div className="ella-pdp-accordion-inner">
            <Paragraph className="ella-pdp-copy">
              {product.description || 'Thoughtfully crafted. Full details arriving soon.'}
            </Paragraph>
            {product.vendor?.trim() ? (
              <div className="ella-pdp-spec-grid">
                <div>
                  <span className="ella-pdp-spec-k">Vendor</span>
                  <span className="ella-pdp-spec-v">{product.vendor}</span>
                </div>
              </div>
            ) : null}
          </div>
        ),
      },
      {
        key: 'ship',
        label: 'Shipping & returns',
        children: (
          <div className="ella-pdp-accordion-inner">
            <Paragraph className="ella-pdp-copy">
              Complimentary shipping on qualifying orders. Standard delivery in 3–5 business days. Easy returns within 14
              days — items must be unworn with tags attached.
            </Paragraph>
          </div>
        ),
      },
      {
        key: 'fabric',
        label: 'Fabric & care',
        children: (
          <div className="ella-pdp-accordion-inner">
            <Paragraph className="ella-pdp-copy">
              Composition and laundering instructions vary by piece. Refer to the label inside your garment — dry clean or
              machine wash cold as directed.
            </Paragraph>
          </div>
        ),
      },
    ]
  }, [product, sizeChart, sizeChartBusy, selection, applySuggestedSize])

  if (!Number.isFinite(productId)) {
    return (
      <div className="shopify-product-error">
        <Alert message="Invalid product" description="Missing or invalid product id in URL." type="error" showIcon />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="shopify-product-loading">
        <Spin size="large" />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="shopify-product-error">
        <Alert
          message="Error"
          description="Failed to load product details. Please try again later."
          type="error"
          showIcon
        />
      </div>
    )
  }

  const collectionNav = resolveCollectionPresentation(product, collectionsCatalog ?? undefined)

  const mainImage = getSafeImageSrc(selectedImage, gallery[0], product.featured_image)
  const isWishlisted = wishlistState.items.some((item) => item.id === product.id)
  const defaultV = defaultVariant ?? matchedVariant

  const handleOptionChange = (optionId: number, valueId: number) => {
    setSelection((prev) => ({ ...prev, [optionId]: valueId }))
    setQuantity(1)
  }

  const handleAddToCart = () => {
    if (!matchedVariant) {
      message.error('Choose a valid variant.')
      return
    }
    cartDispatch({
      type: 'ADD_ITEM',
      payload: {
        id: matchedVariant.id,
        productId: product.id,
        title:
          matchedVariant.title && matchedVariant.title !== product.title
            ? `${product.title} — ${matchedVariant.title}`
            : product.title,
        price: priceNum,
        quantity,
        image: getSafeImageSrc(matchedVariant.image, gallery[0], product.featured_image),
      },
    })
    message.success({
      content: `${product.title} added to bag`,
      duration: 2,
    })
  }

  const handleWishlistToggle = () => {
    const v = defaultV
    if (!v) return
    const listPrice = parseMoney(v.price)
    wishlistDispatch({
      type: 'TOGGLE_ITEM',
      payload: {
        id: product.id,
        variantId: v.id,
        title: product.title,
        price: listPrice,
        image: getSafeImageSrc(v.image, product.featured_image, gallery[0]),
      },
    })
    message.success({
      content: isWishlisted ? 'Removed from wishlist' : 'Saved to wishlist',
      duration: 2,
    })
  }

  return (
    <div className="shopify-product-page ella-pdp-page">
      <div className="shopify-product-container ella-pdp-shell">
        <nav className="pdp-breadcrumb" aria-label="Breadcrumb">
          <ol className="pdp-breadcrumb__list">
            <li>
              <Link to="/">Home</Link>
            </li>
            {collectionNav.id != null ? (
              <li className="pdp-breadcrumb__item">
                <span className="pdp-breadcrumb__sep">/</span>
                <Link
                  to={{
                    pathname: SHOP_PRODUCTS_PATH,
                    search: `?${createSearchParams({ collection: String(collectionNav.id) })}`,
                  }}
                >
                  {collectionNav.title}
                </Link>
              </li>
            ) : null}
            <li className="pdp-breadcrumb__item">
              <span className="pdp-breadcrumb__sep">/</span>
              <span className="pdp-breadcrumb__current">{product.title}</span>
            </li>
          </ol>
        </nav>

        <div className="ella-pdp-grid">
          <div className="ella-pdp-gallery-column">
            <div className="ella-pdp-feature-card">
              <div className="shopify-product-main-image pdp-main-shot ella-pdp-feature-shot">
                <img src={mainImage} alt={product.title} onError={handleImageError} />
              </div>

              <div className="ella-pdp-thumb-strip">
                {gallery.slice(0, 12).map((image) => {
                  const isActive =
                    selectedImage === image || (!selectedImage && image === gallery[0])
                  return (
                    <button
                      key={image}
                      type="button"
                      aria-label="View image"
                      onClick={() => setSelectedImage(image)}
                      className={isActive ? 'ella-pdp-thumb-btn ella-pdp-thumb-btn--active' : 'ella-pdp-thumb-btn'}
                    >
                      <img
                        src={getSafeImageSrc(image, product.featured_image)}
                        alt=""
                        onError={handleImageError}
                      />
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <aside className="ella-pdp-aside">
            <Card className="shopify-product-buy-card ella-pdp-buy-sheet" bordered={false} styles={{ body: { padding: 0 } }}>
              <Space direction="vertical" size={22} style={{ width: '100%' }}>
                <header className="pdp-buy-header ella-pdp-buy-head">
                  {collectionNav.id != null ? (
                    <Link
                      to={{
                        pathname: SHOP_PRODUCTS_PATH,
                        search: `?${createSearchParams({ collection: String(collectionNav.id) })}`,
                      }}
                      className="pdp-collection-meta"
                    >
                      {collectionNav.title}
                    </Link>
                  ) : product.vendor ? (
                    <Text className="pdp-vendor-name">{product.vendor}</Text>
                  ) : (
                    <Text className="pdp-vendor-name pdp-vendor-name--muted">Atelier Ella</Text>
                  )}
                  <Title level={1} className="product-detail-title">
                    {product.title}
                  </Title>

                  <div className="pdp-price-row ella-pdp-price-row">
                    {matchedVariant ? (
                      <>
                        <span className="pdp-price">${priceNum.toFixed(2)}</span>
                        {originalPrice !== undefined ? (
                          <span className="pdp-price-compare">${originalPrice.toFixed(2)}</span>
                        ) : null}
                        {discount > 0 ? <span className="pdp-save-pill">{`-${discount}%`}</span> : null}
                      </>
                    ) : (
                      <span className="pdp-price">—</span>
                    )}
                  </div>
                  <Text type="secondary" className="ella-pdp-stock">
                    {inventory > 0 ? `In stock (${inventory})` : 'Sold out'}
                  </Text>
                </header>

                {(product.options ?? []).map((opt) => (
                  <div key={opt.id} className="ella-pdp-option-block">
                    <span className="ella-pdp-option-heading">{opt.name}</span>
                    <div className="ella-pdp-pill-row" role="listbox" aria-label={opt.name}>
                      {(opt.values ?? []).map((v) => {
                        const active = selection[opt.id] === v.id
                        return (
                          <button
                            key={v.id}
                            type="button"
                            role="option"
                            aria-selected={active}
                            className={`ella-pdp-pill${active ? ' ella-pdp-pill--active' : ''}`}
                            onClick={() => handleOptionChange(opt.id, v.id)}
                          >
                            {v.value}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}

                {hasInvalidCombo ? (
                  <Alert type="warning" showIcon message="That combination isn't available." />
                ) : null}

                <div className="ella-pdp-qty-row">
                  <span className="ella-pdp-option-heading">Quantity</span>
                  <InputNumber
                    min={1}
                    max={Math.max(1, inventory)}
                    value={quantity}
                    onChange={(value) => setQuantity(value ?? 1)}
                  />
                </div>

                <Space direction="vertical" style={{ width: '100%' }} size={10}>
                  <Button
                    type="primary"
                    size="large"
                    icon={<ShoppingCartOutlined />}
                    onClick={handleAddToCart}
                    disabled={Boolean(!matchedVariant || inventory === 0)}
                    className="shopify-product-primary-btn"
                  >
                    Add to bag
                  </Button>
                  <Button
                    size="large"
                    icon={<HeartOutlined />}
                    onClick={handleWishlistToggle}
                    disabled={!defaultV}
                    className="shopify-product-secondary-btn"
                  >
                    {isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                  </Button>
                </Space>

                <div className="ella-pdp-trust">
                  <div>
                    <span className="ella-pdp-trust-line">Trusted checkout</span>
                    <span className="ella-pdp-trust-sub">SSL secure</span>
                  </div>
                  <div>
                    <span className="ella-pdp-trust-line">Easy returns</span>
                    <span className="ella-pdp-trust-sub">14-day window</span>
                  </div>
                  <div>
                    <span className="ella-pdp-trust-line">Thoughtful packing</span>
                    <span className="ella-pdp-trust-sub">Recyclable boxes</span>
                  </div>
                </div>
              </Space>
            </Card>
          </aside>
        </div>

        {collectionNav.id != null ? (
          <div className="ella-pdp-inline-collection">
            <Text type="secondary" className="ella-pdp-inline-label">
              Part of
            </Text>
            <Link
              to={{
                pathname: SHOP_PRODUCTS_PATH,
                search: `?${createSearchParams({ collection: String(collectionNav.id) })}`,
              }}
              className="product-collection-inline"
            >
              <span className="product-collection-inline__thumb">
                <img src={getSafeImageSrc(collectionNav.image)} alt="" onError={handleImageError} />
              </span>
              {collectionNav.title}
            </Link>
          </div>
        ) : null}

        <Collapse
          bordered={false}
          className="ella-pdp-collapse"
          expandIconPosition="end"
          defaultActiveKey={['desc']}
          items={collapseItems}
        />
      </div>
    </div>
  )
}

export default ProductDetail
