import { useCart } from '../context/CartContext'
import { Card, Button, InputNumber, Space, Typography, Empty, Divider } from 'antd'
import { DeleteOutlined, ShoppingOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom'
import { SHOP_PRODUCTS_PATH } from '../constants/storeRoutes'
import { getSafeImageSrc, handleImageError } from '../utils/image'
import './cart.css'

const { Title, Text } = Typography

const Cart = () => {
  const { state, dispatch } = useCart()

  const handleUpdateQuantity = (id: number, quantity: number | null) => {
    if (quantity !== null && quantity > 0) {
      dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } })
    }
  }

  const handleRemoveItem = (id: number) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { id } })
  }

  const handleClearCart = () => {
    dispatch({ type: 'CLEAR_CART' })
  }

  if (state.items.length === 0) {
    return (
      <div className="shopify-cart-empty">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Your cart is empty"
        >
          <Link to={SHOP_PRODUCTS_PATH}>
            <Button type="primary" icon={<ShoppingOutlined />} className="shopify-primary-button">
              Continue Shopping
            </Button>
          </Link>
        </Empty>
      </div>
    )
  }

  return (
    <div className="shopify-cart-page">
      <div className="shopify-cart-container">
      <Title level={2} className="shopify-cart-title">
        Your bag
      </Title>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {state.items.map((item) => (
          <Card key={item.id} className="shopify-cart-item-card">
            <div className="shopify-cart-item-row">
              <img
                src={getSafeImageSrc(item.image)}
                alt={item.title}
                onError={handleImageError}
                className="shopify-cart-item-image"
              />
              <div className="shopify-cart-item-content">
                <Title level={4} className="shopify-cart-item-name">
                  <Link to={`/product/${item.productId}`}>{item.title}</Link>
                </Title>
                <Text type="secondary" className="shopify-cart-item-price">
                  ${item.price.toFixed(2)} each
                </Text>
              </div>
              <Space className="shopify-cart-item-controls">
                <InputNumber
                  min={1}
                  value={item.quantity}
                  onChange={(value) => handleUpdateQuantity(item.id, value)}
                  style={{ width: 84 }}
                />
                <Text strong className="shopify-cart-line-total">${(item.price * item.quantity).toFixed(2)}</Text>
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleRemoveItem(item.id)}
                />
              </Space>
            </div>
          </Card>
        ))}

        <Divider />

        <div className="shopify-cart-footer">
          <Title level={3} className="shopify-cart-total">Total: ${state.total.toFixed(2)}</Title>
          <Space className="shopify-cart-footer-actions">
            <Button onClick={handleClearCart} className="shopify-secondary-button">Clear Cart</Button>
            <Link to="/checkout">
              <Button type="primary" size="large" className="shopify-primary-button shopify-checkout-button">
                Checkout
              </Button>
            </Link>
          </Space>
        </div>
      </Space>
      </div>
    </div>
  )
}

export default Cart