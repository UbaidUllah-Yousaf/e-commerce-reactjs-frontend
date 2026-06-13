import { Link } from 'react-router-dom'
import { Button, Typography } from 'antd'
import './checkoutResult.css'

const { Title, Text } = Typography

export default function CheckoutCancel() {
  return (
    <div className="checkout-result-page checkout-result-page--centered">
      <Title level={2}>Payment cancelled</Title>
      <Text type="secondary" style={{ display: 'block', maxWidth: 420, margin: '12px auto 28px' }}>
        Your cart is unchanged. You can return to checkout and try again when you are ready.
      </Text>
      <div className="checkout-result-actions">
        <Link to="/checkout">
          <Button type="primary" className="shopify-checkout-primary-btn">
            Back to checkout
          </Button>
        </Link>
        <Link to="/cart">
          <Button>View cart</Button>
        </Link>
      </div>
    </div>
  )
}
