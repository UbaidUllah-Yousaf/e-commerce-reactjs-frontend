import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { App as AntdApp, Button, Col, Row, Typography } from 'antd'
import { HeartOutlined } from '@ant-design/icons'
import { SHOP_PRODUCTS_PATH } from '../constants/storeRoutes'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import ProductCard from '../components/productCard'
import type { ProductCardActionData } from '../components/ProductListingShop'
import './wishlistPage.css'

const { Title, Text } = Typography

export default function WishlistPage() {
  const { message } = AntdApp.useApp()
  const navigate = useNavigate()
  const { state: cartState, dispatch: cartDispatch } = useCart()
  const { state: wishlistState, dispatch: wishlistDispatch } = useWishlist()

  const count = wishlistState.items.length

  const cartVariantIds = useMemo(
    () => new Set(cartState.items.map((c) => c.id)),
    [cartState.items],
  )

  const handleMoveAllToCart = () => {
    const n = wishlistState.items.length
    wishlistState.items.forEach((item) => {
      cartDispatch({
        type: 'ADD_ITEM',
        payload: {
          id: item.variantId,
          productId: item.id,
          title: item.title || 'Product',
          price: item.price,
          image: item.image,
        },
      })
    })
    wishlistDispatch({ type: 'CLEAR_WISHLIST' })
    message.success(`${n} item${n === 1 ? '' : 's'} moved to bag`)
    void navigate('/cart')
  }

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
    message.success(`${product.name} added to bag`)
  }

  const handleWishlistToggle = (product: ProductCardActionData) => {
    wishlistDispatch({ type: 'REMOVE_ITEM', payload: { id: product.productId } })
    message.success('Removed from wishlist')
  }

  const bagLine = `${cartState.items.reduce((s, i) => s + i.quantity, 0)} items · $${cartState.total.toFixed(2)}`

  return (
    <div className="wishlist-page store-shell wishlist-page--wide">
      <div className="wishlist-page__top-card">
        <nav className="wishlist-page__crumb" aria-label="Breadcrumb">
          <Link to="/" className="wishlist-page__crumb-link">
            Home
          </Link>
          <span className="wishlist-page__crumb-sep" aria-hidden>
            /
          </span>
          <span className="wishlist-page__crumb-current">Wishlist</span>
        </nav>

        <header className="wishlist-page__masthead">
          <div className="wishlist-page__masthead-text">
            <p className="wishlist-page__eyebrow">Saved items</p>
            <Title level={2} className="wishlist-page__title">
              Wishlist
            </Title>
            <Text type="secondary" className="wishlist-page__meta">
              {count === 0
                ? 'Save pieces you love — they stay here until you move them to your bag.'
                : `${count} saved ${count === 1 ? 'piece' : 'pieces'} · Use your bag and saved addresses at checkout.`}
            </Text>
          </div>
          {count > 0 ? (
            <div className="wishlist-page__masthead-actions">
              <div className="wishlist-page__bag-pill">
                <span className="wishlist-page__bag-label">Bag</span>
                <span className="wishlist-page__bag-value">{bagLine}</span>
              </div>
              <Button type="primary" className="wishlist-page__cta-all hero-shop-btn" onClick={handleMoveAllToCart}>
                Move all to bag
              </Button>
            </div>
          ) : null}
        </header>
      </div>

      {count === 0 ? (
        <div className="wishlist-page__empty-wrap">
          <div className="wishlist-page__empty-icon-wrap" aria-hidden>
            <HeartOutlined className="wishlist-page__empty-icon" />
          </div>
          <p className="wishlist-page__empty-title">No favorites yet</p>
          <p className="wishlist-page__empty-desc">
            Browse the catalog and tap the heart on any product — your picks will show here as full cards, same as the
            shop grid.
          </p>
          <Link to={SHOP_PRODUCTS_PATH}>
            <Button type="primary" size="large" className="hero-shop-btn">
              Shop products
            </Button>
          </Link>
        </div>
      ) : (
        <section className="wishlist-page__grid-section" aria-label="Saved products">
          <Row gutter={[16, 24]} className="wishlist-page__grid">
            {wishlistState.items.map((item) => {
              const isInCart = cartVariantIds.has(item.variantId)
              return (
                <Col key={item.id} xs={24} sm={12} md={8} lg={8} xl={6}>
                  <ProductCard
                    id={item.id}
                    variantId={item.variantId}
                    image={item.image}
                    name={item.title || 'Product'}
                    price={item.price}
                    inStock
                    isWishlisted
                    isInCart={isInCart}
                    onAddToCart={handleAddToCart}
                    onWishlistToggle={handleWishlistToggle}
                  />
                </Col>
              )
            })}
          </Row>
        </section>
      )}
    </div>
  )
}
