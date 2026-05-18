import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Spin, Alert, Typography, Button, Tag } from 'antd'
import { RightOutlined } from '@ant-design/icons'
import type { Order } from '../types/commerce'
import {
  formatOrderCurrency,
  formatOrderLabel,
  paymentStatusBadgeClasses,
  paymentStatusDisplayText,
} from '../utils/commerce'
import { parseMoney } from '../utils/catalog'
import { fulfillmentStatusBadgeClasses, fulfillmentStatusDisplayText } from '../utils/shopifyFulfillmentBadge'
import { SHOP_PRODUCTS_PATH } from '../constants/storeRoutes'

const { Text } = Typography

const PAGE_SIZE = 8

function formatOrderDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })
}

function OrderRow({ order }: { order: Order }) {
  return (
    <li>
      <Link to={`/orders/${order.id}`} className="account-order-row">
        <div className="account-order-row__primary">
          <span className="account-order-row__label">{formatOrderLabel(order)}</span>
          <span className="account-order-row__date">{formatOrderDate(order.created_at)}</span>
        </div>

        <div className="account-order-row__badges" aria-label="Order status">
          <Tag className={paymentStatusBadgeClasses(order.financial_status)}>
            {paymentStatusDisplayText(order)}
          </Tag>
          <Tag className={fulfillmentStatusBadgeClasses(order.fulfillment_status)}>
            {fulfillmentStatusDisplayText(order)}
          </Tag>
        </div>

        <div className="account-order-row__end">
          <span className="account-order-row__total">
            {formatOrderCurrency(parseMoney(order.total), order.currency)}
          </span>
          <span className="account-order-row__cta">
            View
            <RightOutlined className="account-order-row__chevron" aria-hidden />
          </span>
        </div>
      </Link>
    </li>
  )
}

export interface AccountOrdersListProps {
  orders: Order[] | undefined
  isLoading: boolean
  error: Error | null
}

export function AccountOrdersList({ orders, isLoading, error }: AccountOrdersListProps) {
  const [page, setPage] = useState(1)

  const sorted = useMemo(
    () =>
      [...(orders ?? [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [orders],
  )

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageOrders = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  if (isLoading) {
    return (
      <div className="account-loading">
        <Spin />
      </div>
    )
  }

  if (error) {
    return (
      <Alert
        type="warning"
        showIcon
        message="Could not load orders"
        description={
          error.message || 'Refresh the page or sign in again if your session expired.'
        }
      />
    )
  }

  if (sorted.length === 0) {
    return (
      <div className="account-empty-orders">
        <Text type="secondary">You haven&apos;t placed an order yet.</Text>
        <Link to={SHOP_PRODUCTS_PATH}>
          <Button type="primary" className="account-cta-btn">
            Start shopping
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="account-orders-list-wrap">
      <ul className="account-orders-list">
        {pageOrders.map((order) => (
          <OrderRow key={order.id} order={order} />
        ))}
      </ul>

      {totalPages > 1 ? (
        <nav className="account-orders-pager" aria-label="Order list pagination">
          <button
            type="button"
            className="account-orders-pager__btn"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className="account-orders-pager__meta">
            Page {safePage} of {totalPages}
          </span>
          <button
            type="button"
            className="account-orders-pager__btn"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </nav>
      ) : null}
    </div>
  )
}
