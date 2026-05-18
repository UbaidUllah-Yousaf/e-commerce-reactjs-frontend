import { Button, Tooltip } from 'antd'
import {
  ShoppingCartOutlined,
  HeartOutlined,
  HeartFilled,
  CheckOutlined,
} from '@ant-design/icons'
import { Link } from 'react-router-dom'
import { getSafeImageSrc, handleImageError } from '../utils/image'
import type { ProductCardActionData } from './ProductListingShop'
import './productListRow.css'

export interface ProductListRowProps {
  productId: number
  variantId: number
  image: string
  name: string
  price: number
  originalPrice?: number
  inStock?: boolean
  isWishlisted?: boolean
  isInCart?: boolean
  onAddToCart?: (product: ProductCardActionData) => void
  onWishlistToggle?: (product: ProductCardActionData) => void
}

export function ProductListRow({
  productId,
  variantId,
  image,
  name,
  price,
  originalPrice,
  inStock = true,
  isWishlisted = false,
  isInCart = false,
  onAddToCart,
  onWishlistToggle,
}: ProductListRowProps) {
  const payload: ProductCardActionData = {
    productId,
    variantId,
    image,
    name,
    price,
  }

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onWishlistToggle?.(payload)
  }

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onAddToCart?.(payload)
  }

  return (
    <article className="ella-plp-row">
      <Link to={`/product/${productId}`} className="ella-plp-row__media-link">
        <div className="ella-plp-row__media">
          <img src={getSafeImageSrc(image)} alt="" onError={handleImageError} />
        </div>
      </Link>
      <div className="ella-plp-row__body">
        <Link to={`/product/${productId}`} className="ella-plp-row__title-link">
          <h3 className="ella-plp-row__title">{name}</h3>
        </Link>
        <div className="ella-plp-row__price-row">
          <span className="ella-plp-row__price">${price.toFixed(2)}</span>
          {originalPrice != null ? (
            <span className="ella-plp-row__compare">${originalPrice.toFixed(2)}</span>
          ) : null}
        </div>
      </div>
      <div className="ella-plp-row__actions">
        <Tooltip title={isWishlisted ? 'Remove from wishlist' : 'Save'}>
          <Button
            type="text"
            className={`ella-plp-row__icon-btn${isWishlisted ? ' ella-plp-row__icon-btn--wishlist-active' : ''}`}
            icon={
              isWishlisted ? (
                <HeartFilled className="ella-plp-row__heart-filled" />
              ) : (
                <HeartOutlined />
              )
            }
            onClick={handleWishlistToggle}
          />
        </Tooltip>
        <Tooltip title={isInCart ? 'In bag' : 'Add to bag'}>
          <Button
            type="text"
            className={`ella-plp-row__icon-btn${isInCart ? ' ella-plp-row__icon-btn--cart-active' : ''}`}
            icon={isInCart ? <CheckOutlined /> : <ShoppingCartOutlined />}
            onClick={handleAddToCart}
            disabled={!inStock}
          />
        </Tooltip>
      </div>
    </article>
  )
}
