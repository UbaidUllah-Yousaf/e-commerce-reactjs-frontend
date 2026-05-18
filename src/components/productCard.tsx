import { useCallback, useEffect, useMemo, useState } from 'react'
import { ShoppingCartOutlined, HeartOutlined, HeartFilled, CheckOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { getSafeImageSrc, handleImageError } from '../utils/image'
import type { ProductCardVariantChoice } from '../utils/productCardData'
import './productCard.css'

export interface ProductCardActionData {
  productId: number
  variantId: number
  image: string
  name: string
  price: number
}

interface ProductCardProps {
  id: string | number
  variantId: number
  image: string
  name: string
  price: number
  originalPrice?: number
  rating?: number
  inStock?: boolean
  isNew?: boolean
  isWishlisted?: boolean
  isInCart?: boolean
  brand?: string
  subtitle?: string
  /** Plain-text excerpt under price (HTML stripped at source). */
  description?: string
  /** Number of carousel dots under the image (variants or gallery). */
  carouselDotCount?: number
  variantChoices?: ProductCardVariantChoice[]
  onAddToCart?: (product: ProductCardActionData) => void
  onWishlistToggle?: (product: ProductCardActionData) => void
}

const ProductCard = ({
  id,
  variantId,
  image,
  name,
  price,
  originalPrice,
  inStock = true,
  isNew = false,
  isWishlisted = false,
  isInCart = false,
  brand,
  subtitle,
  description,
  carouselDotCount: carouselDotCountProp,
  variantChoices,
  onAddToCart,
  onWishlistToggle,
}: ProductCardProps) => {
  const navigate = useNavigate()
  const [selectedIdx, setSelectedIdx] = useState(0)

  useEffect(() => {
    if (!variantChoices?.length) return
    const i = variantChoices.findIndex((c) => c.variantId === variantId)
    setSelectedIdx(i >= 0 ? i : 0)
  }, [variantId, variantChoices])

  const activeChoice = variantChoices?.[selectedIdx]
  const displayImage = activeChoice?.image ?? image
  const displayPrice = activeChoice?.price ?? price
  const displayCompare =
    activeChoice?.compareAt != null ? activeChoice.compareAt : originalPrice

  const discountPct =
    displayCompare && displayCompare > displayPrice
      ? Math.round(((displayCompare - displayPrice) / displayCompare) * 100)
      : 0

  const resolvePid = useCallback(() => {
    const pid = typeof id === 'number' ? id : Number(id)
    return Number.isFinite(pid) ? pid : Number(id)
  }, [id])

  const buildPayload = useCallback(
    (vid: number, imgSrc: string, priceVal: number): ProductCardActionData => ({
      productId: resolvePid(),
      variantId: vid,
      image: getSafeImageSrc(imgSrc),
      name,
      price: priceVal,
    }),
    [resolvePid, name],
  )

  const activeVariantId = activeChoice?.variantId ?? variantId

  const handleCardNav = () => {
    navigate(`/product/${id}`)
  }

  const handleWishlistToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    onWishlistToggle?.(
      buildPayload(activeVariantId, displayImage, displayPrice),
    )
  }

  const handleAddToCart = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    onAddToCart?.(buildPayload(activeVariantId, displayImage, displayPrice))
  }

  const handleSwatchClick = (event: React.MouseEvent, index: number) => {
    event.stopPropagation()
    setSelectedIdx(index)
  }

  const showSwatches = Boolean(variantChoices && variantChoices.length > 1)

  const carouselDotCount = useMemo(() => {
    if (carouselDotCountProp != null && carouselDotCountProp >= 1) {
      return Math.min(carouselDotCountProp, 8)
    }
    if (variantChoices && variantChoices.length > 1) {
      return variantChoices.length
    }
    return 1
  }, [carouselDotCountProp, variantChoices])

  const activeDotIndex =
    variantChoices && variantChoices.length > 1
      ? Math.min(selectedIdx, carouselDotCount - 1)
      : 0

  return (
    <article className="product-card product-card--studio" onClick={handleCardNav}>
      <div className="product-card-studio__shell">
        <button
          type="button"
          className={`product-card-studio__wishlist ${isWishlisted ? 'product-card-studio__wishlist--on' : ''}`}
          onClick={handleWishlistToggle}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          {isWishlisted ? (
            <HeartFilled className="product-card-studio__heart product-card-studio__heart--filled" />
          ) : (
            <HeartOutlined className="product-card-studio__heart" />
          )}
        </button>

        <div className="product-card-studio__media" role="presentation">
          <div className="product-card-studio__marble" aria-hidden />
          <img
            alt=""
            src={getSafeImageSrc(displayImage)}
            onError={handleImageError}
            className="product-card-studio__img"
          />
          <div className="product-card-studio__dots" aria-hidden>
            {Array.from({ length: carouselDotCount }).map((_, i) => (
              <span
                key={i}
                className={`product-card-studio__dot ${i === activeDotIndex ? 'product-card-studio__dot--active' : ''}`}
              />
            ))}
          </div>
          {(isNew || discountPct > 0 || !inStock) ? (
            <div className="product-card-studio__tags">
              {isNew ? <span className="product-card-studio__tag product-card-studio__tag--new">New</span> : null}
              {discountPct > 0 ? (
                <span className="product-card-studio__tag product-card-studio__tag--sale">-{discountPct}%</span>
              ) : null}
              {!inStock ? (
                <span className="product-card-studio__tag product-card-studio__tag--sold">Sold out</span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="product-card-studio__body" role="presentation">
          {brand ? (
            <span className="product-card-studio__brand">{brand}</span>
          ) : null}
          <h3 className="product-card-studio__title">{name}</h3>
          <div className="product-card-studio__price-row">
            <span className="product-card-studio__price">${displayPrice.toFixed(2)}</span>
            {displayCompare != null && displayCompare > displayPrice ? (
              <span className="product-card-studio__compare">${displayCompare.toFixed(2)}</span>
            ) : null}
          </div>
          {subtitle && !description ? (
            <p className="product-card-studio__lede">{subtitle}</p>
          ) : null}
          {description ? (
            <p className="product-card-studio__desc">{description}</p>
          ) : null}

          <div
            className="product-card-studio__toolbar"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            {showSwatches ? (
              <div className="product-card-studio__colors">
                <span className="product-card-studio__colors-label">Colors</span>
                <div className="product-card-studio__swatches">
                  {variantChoices!.map((c, i) => (
                    <button
                      key={c.variantId}
                      type="button"
                      className={`product-card-studio__swatch ${selectedIdx === i ? 'product-card-studio__swatch--active' : ''}`}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                      aria-label={c.label}
                      aria-pressed={selectedIdx === i}
                      onClick={(e) => handleSwatchClick(e, i)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <span className="product-card-studio__colors-placeholder" aria-hidden />
            )}
            <button
              type="button"
              className={`product-card-studio__cart ${isInCart ? 'product-card-studio__cart--in' : ''}`}
              onClick={handleAddToCart}
              disabled={!inStock}
              aria-label={isInCart ? 'In bag' : 'Add to bag'}
            >
              {isInCart ? (
                <CheckOutlined className="product-card-studio__cart-icon" />
              ) : (
                <ShoppingCartOutlined className="product-card-studio__cart-icon" />
              )}
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

export default ProductCard
