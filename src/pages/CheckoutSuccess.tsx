import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Alert, Button, Spin, Typography } from 'antd'
import { confirmStripeSession } from '../api/stripe'
import { fetchOrders } from '../api/orders'
import { useCart } from '../context/CartContext'
import { formatOrderLabel } from '../utils/commerce'
import './checkoutResult.css'

const { Title, Text } = Typography

const CK_ID = 'storefront_ck_id'
const CK_FP = 'storefront_ck_fp'

async function confirmWithRetry(sessionId: string, attempts = 8): Promise<Awaited<ReturnType<typeof confirmStripeSession>>> {
  let lastError: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await confirmStripeSession(sessionId)
    } catch (e) {
      lastError = e
      await new Promise((r) => setTimeout(r, 1500))
    }
  }
  throw lastError
}

export default function CheckoutSuccess() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { dispatch: cartDispatch } = useCart()
  const sessionId = params.get('session_id')?.trim() ?? ''
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) {
      setError('Missing payment session. If you were charged, check your email or order history.')
      return
    }

    let cancelled = false

    async function run() {
      try {
        const order = await confirmWithRetry(sessionId)
        if (cancelled) return
        sessionStorage.removeItem(CK_ID)
        sessionStorage.removeItem(CK_FP)
        cartDispatch({ type: 'CLEAR_CART' })
        navigate(`/orders/${order.id}`, { replace: true, state: { orderLabel: formatOrderLabel(order) } })
      } catch (e) {
        if (cancelled) return
        try {
          const orders = await fetchOrders()
          const paid = orders.find((o) => o.financial_status === 'paid')
          if (paid) {
            sessionStorage.removeItem(CK_ID)
            sessionStorage.removeItem(CK_FP)
            cartDispatch({ type: 'CLEAR_CART' })
            navigate(`/orders/${paid.id}`, { replace: true })
            return
          }
        } catch {
          /* ignore */
        }
        setError(
          e instanceof Error
            ? e.message
            : 'Payment received but order confirmation is still processing. Check order history shortly.',
        )
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [sessionId, navigate, cartDispatch])

  if (!sessionId || error) {
    return (
      <div className="checkout-result-page">
        <Alert
          type={error ? 'warning' : 'error'}
          showIcon
          message={error ? 'Order pending' : 'Invalid return URL'}
          description={error ?? 'No session_id in the return URL from Stripe.'}
        />
        <div className="checkout-result-actions">
          <Link to="/account">
            <Button type="primary" className="shopify-checkout-primary-btn">
              View account
            </Button>
          </Link>
          <Link to="/">
            <Button>Continue shopping</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="checkout-result-page checkout-result-page--centered">
      <Spin size="large" />
      <Title level={3} style={{ marginTop: 24 }}>
        Confirming your payment…
      </Title>
      <Text type="secondary">Please wait while we finalize your order.</Text>
    </div>
  )
}
