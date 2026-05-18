import { Link, useParams } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Breadcrumb, Spin, Alert, Typography, Tag, Button, Divider } from 'antd'
import {
  ArrowLeftOutlined,
  EnvironmentOutlined,
  HomeOutlined,
  InboxOutlined,
  ShoppingOutlined,
  TruckOutlined,
} from '@ant-design/icons'
import { fetchOrder } from '../api/orders'
import { parseMoney } from '../utils/catalog'
import { formatOrderCurrency, formatOrderLabel } from '../utils/commerce'
import {
  fulfillmentCarrierLabel,
  fulfillmentServiceLogoUrl,
  fulfillmentTrackingUrl,
  lineItemFulfillmentSnapshot,
  orderLineItemImageSrc,
} from '../utils/orderDisplay'
import { getSafeImageSrc, handleImageError } from '../utils/image'
import {
  fulfillmentStatusBadgeClasses,
  fulfillmentStatusDisplayText,
} from '../utils/shopifyFulfillmentBadge'
import type { Fulfillment, Order, OrderLineItem } from '../types/commerce'
import './account.css'
import './orderDetail.css'

const { Text } = Typography

function addrStr(addr: Record<string, unknown> | null | undefined, key: string): string {
  if (!addr) return ''
  const v = addr[key]
  return typeof v === 'string' ? v : v != null ? String(v) : ''
}

function hasMeaningfulAddress(addr: Record<string, unknown> | null | undefined): boolean {
  if (!addr || typeof addr !== 'object') return false
  return Boolean(
    addrStr(addr, 'address1') ||
      addrStr(addr, 'city') ||
      addrStr(addr, 'first_name') ||
      addrStr(addr, 'last_name'),
  )
}

function lineItemInitials(item: OrderLineItem): string {
  const t = item.product_title?.trim() || '?'
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0]!.charAt(0) + parts[1]!.charAt(0)).toUpperCase()
  }
  return t.slice(0, 2).toUpperCase() || '—'
}

function AddressPanel({
  title,
  icon,
  addr,
}: {
  title: string
  icon: ReactNode
  addr: Record<string, unknown> | null | undefined
}) {
  if (!hasMeaningfulAddress(addr)) {
    return (
      <div className="od-address-card">
        <p className="od-address-card__label">
          {icon}
          {title}
        </p>
        <Text type="secondary">Not provided</Text>
      </div>
    )
  }

  const name = `${addrStr(addr, 'first_name')} ${addrStr(addr, 'last_name')}`.trim() || '—'
  const line1 = [addrStr(addr, 'address1'), addrStr(addr, 'address2')].filter(Boolean).join(', ')
  const cityLine = [addrStr(addr, 'city'), addrStr(addr, 'province')].filter(Boolean).join(', ')
  const zip = addrStr(addr, 'zip')
  const company = addrStr(addr, 'company')
  const phone = addrStr(addr, 'phone')
  const country = addrStr(addr, 'country')

  return (
    <div className="od-address-card">
      <p className="od-address-card__label">
        {icon}
        {title}
      </p>
      <p className="od-address-card__name">{name}</p>
      {line1 ? <p className="od-address-card__line">{line1}</p> : null}
      {cityLine || zip ? (
        <p className="od-address-card__line">
          {cityLine}
          {cityLine && zip ? ' ' : ''}
          {zip}
        </p>
      ) : null}
      {company ? <p className="od-address-card__line od-address-card__line--muted">{company}</p> : null}
      {phone ? <p className="od-address-card__line od-address-card__line--muted">{phone}</p> : null}
      {country ? <p className="od-address-card__country">{country}</p> : null}
    </div>
  )
}

function FulfillmentPanel({ order }: { order: Order }) {
  const list = order.fulfillments ?? []
  if (list.length === 0) {
    return (
      <div className="od-fulfillment-stack">
        <p className="od-empty-hint">
          <InboxOutlined style={{ marginRight: 8 }} aria-hidden />
          No shipments recorded yet. You will see tracking here when your order ships.
        </p>
      </div>
    )
  }

  return (
    <div className="od-fulfillment-stack">
      {list.map((f: Fulfillment) => {
        const trackHref = fulfillmentTrackingUrl(f)
        const carrier = fulfillmentCarrierLabel(f)
        const num = f.tracking_number?.trim()
        const logoUrl = fulfillmentServiceLogoUrl(f)

        return (
          <div key={f.id} className="od-fulfillment-card">
            <div className="od-fulfillment-card__head">
              <div className="od-fulfillment-card__brand">
                {logoUrl ? (
                  <span className="od-fulfillment-card__logo-wrap" aria-hidden>
                    <img
                      className="od-fulfillment-card__logo"
                      src={getSafeImageSrc(logoUrl)}
                      alt=""
                      loading="lazy"
                      onError={handleImageError}
                    />
                  </span>
                ) : null}
                <div className="od-fulfillment-card__titles">
                  <h3 className="od-fulfillment-card__title">{f.name?.trim() || `Shipment ${f.id}`}</h3>
                  {carrier || num ? (
                    <Text type="secondary" className="od-fulfillment-card__carrier">
                      {carrier || 'Carrier'}
                      {num ? ` · ${num}` : ''}
                    </Text>
                  ) : (
                    <Text type="secondary" className="od-fulfillment-card__carrier">
                      Tracking details pending
                    </Text>
                  )}
                </div>
              </div>
              <Tag className={fulfillmentStatusBadgeClasses(f.status)}>
                {fulfillmentStatusDisplayText({ fulfillment_status: f.status, fulfillment_status_label: null })}
              </Tag>
            </div>
            {trackHref ? (
              <>
                <div className="od-fulfillment-card__track">
                  <a className="od-track-link" href={trackHref} target="_blank" rel="noopener noreferrer">
                    Track shipment
                  </a>
                </div>
                <Text
                  type="secondary"
                  className="od-tracking-url"
                  copyable={{ text: trackHref, tooltips: ['Copy link', 'Copied'] }}
                  ellipsis={{ tooltip: trackHref }}
                >
                  {trackHref}
                </Text>
              </>
            ) : num ? (
              <Text type="secondary" className="od-tracking-url od-tracking-url--pending">
                Tracking link not available yet — reference: <Text code>{num}</Text>
              </Text>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function OrderSummaryAside({ order }: { order: Order }) {
  const ccy = order.currency || 'USD'
  const fmt = (s: string) => formatOrderCurrency(parseMoney(s), ccy)
  const discount = parseMoney(order.discount_amount)
  const gift = parseMoney(order.gift_card_total)

  return (
    <div className="od-summary-card">
      <h2 className="od-section-title" style={{ marginBottom: '1.15rem' }}>
        Order summary
      </h2>
      <div className="od-summary-rows">
        <div className="od-summary-row">
          <span className="od-summary-row__label">Subtotal</span>
          <span className="od-summary-row__value">{fmt(order.subtotal)}</span>
        </div>
        <div className="od-summary-row">
          <span className="od-summary-row__label">Shipping</span>
          <span className="od-summary-row__value">{fmt(order.shipping_total)}</span>
        </div>
        <div className="od-summary-row">
          <span className="od-summary-row__label">Tax</span>
          <span className="od-summary-row__value">{fmt(order.tax_total)}</span>
        </div>
        {discount > 0 ? (
          <div className="od-summary-row od-summary-row--discount">
            <span className="od-summary-row__label">Discount</span>
            <span className="od-summary-row__value">−{fmt(order.discount_amount)}</span>
          </div>
        ) : null}
        {gift > 0 ? (
          <div className="od-summary-row od-summary-row--discount">
            <span className="od-summary-row__label">Gift cards</span>
            <span className="od-summary-row__value">−{fmt(order.gift_card_total)}</span>
          </div>
        ) : null}
      </div>
      <Divider className="od-summary-divider" />
      <div className="od-summary-total">
        <span className="od-summary-total__label">Total</span>
        <span className="od-summary-total__value">{fmt(order.total)}</span>
      </div>
      {(order.discount_code_snapshot?.trim() || order.note?.trim()) && (
        <div className="od-summary-note">
          {order.discount_code_snapshot?.trim() ? (
            <div>
              <Text type="secondary">Code applied: </Text>
              <Text code>{order.discount_code_snapshot.trim()}</Text>
            </div>
          ) : null}
          {order.note?.trim() ? (
            <div style={{ marginTop: order.discount_code_snapshot?.trim() ? 8 : 0 }}>
              <Text type="secondary">Note: {order.note.trim()}</Text>
            </div>
          ) : null}
        </div>
      )}
      <div className="od-back-row">
        <Link to="/account" style={{ display: 'block' }}>
          <Button type="default" icon={<ArrowLeftOutlined />} className="od-back-btn" block>
            Back to account
          </Button>
        </Link>
      </div>
    </div>
  )
}

export default function OrderDetail() {
  const { orderId } = useParams<{ orderId: string }>()
  const id = orderId != null ? Number.parseInt(orderId, 10) : Number.NaN

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', id],
    queryFn: () => fetchOrder(id),
    enabled: Number.isFinite(id),
  })

  if (!Number.isFinite(id)) {
    return (
      <div className="account-page od-page">
        <Alert type="error" message="Invalid order" showIcon className="account-alert" />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="account-page od-page account-page--centered">
        <Spin size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="account-page od-page">
        <Alert
          type="error"
          message="Could not load order"
          description={
            error instanceof Error ? error.message : 'Sign in on the API host or check CORS / session cookies.'
          }
          showIcon
          className="account-alert"
        />
      </div>
    )
  }

  if (!order) {
    return null
  }

  const ccy = order.currency || 'USD'
  const fmt = (s: string) => formatOrderCurrency(parseMoney(s), ccy)
  const lineItems = order.line_items ?? []
  const paid = order.financial_status === 'paid'
  const orderLabel = formatOrderLabel(order)

  return (
    <div className="account-page od-page">
      <Breadcrumb
        className="od-breadcrumb"
        items={[
          { title: <Link to="/">Home</Link> },
          { title: <Link to="/account">Account</Link> },
          { title: <span>Order {orderLabel}</span> },
        ]}
      />

      <header className="od-hero">
        <p className="od-eyebrow">Order detail</p>
        <div className="od-hero-top">
          <div>
            <h1 className="od-title">Order {orderLabel}</h1>
            <p className="od-meta">
              Placed on{' '}
              {new Date(order.created_at).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })}
            </p>
            <p className="od-contact">
              {order.email}
              {order.phone?.trim() ? ` · ${order.phone.trim()}` : ''}
            </p>
          </div>
          <div className="od-tags">
            <Tag className={paid ? 'od-tag--success' : 'od-tag--warn'}>{paid ? 'Paid' : 'Payment pending'}</Tag>
            <Tag className={fulfillmentStatusBadgeClasses(order.fulfillment_status)}>
              {fulfillmentStatusDisplayText(order)}
            </Tag>
          </div>
        </div>
      </header>

      <div className="od-layout">
        <div className="od-main">
          <section className="od-section" aria-labelledby="od-items-heading">
            <h2 id="od-items-heading" className="od-section-title">
              <ShoppingOutlined className="od-section-title__icon" aria-hidden />
              Items ({lineItems.length})
            </h2>
            {lineItems.length === 0 ? (
              <Text type="secondary">No line items on this order.</Text>
            ) : (
              <ul className="od-line-items">
                {lineItems.map((row) => {
                  const lineImg = orderLineItemImageSrc(row)
                  const lineFf = lineItemFulfillmentSnapshot(order, row)
                  return (
                    <li key={row.id} className="od-line-item">
                      <div className="od-line-item__main">
                        <div
                          className={`od-line-item__thumb${lineImg ? ' od-line-item__thumb--photo' : ''}`}
                          aria-hidden
                        >
                          {lineImg ? (
                            <img
                              src={getSafeImageSrc(lineImg)}
                              alt=""
                              loading="lazy"
                              onError={handleImageError}
                            />
                          ) : (
                            lineItemInitials(row)
                          )}
                        </div>
                        <div className="od-line-item__body">
                          <p className="od-line-item__title">{row.product_title}</p>
                          <p className="od-line-item__meta">
                            {row.variant_title}
                            {row.sku ? ` · SKU ${row.sku}` : ''}
                          </p>
                          <div className="od-line-item__status">
                            <Tag
                              className={`${fulfillmentStatusBadgeClasses(lineFf.fulfillment_status)} od-line-item__ff`}
                            >
                              {fulfillmentStatusDisplayText(lineFf)}
                            </Tag>
                          </div>
                        </div>
                      </div>
                      <div className="od-line-item__end">
                        <div className="od-line-item__qty">Qty {row.quantity}</div>
                        <span className="od-line-item__unit">{fmt(row.unit_price)} each</span>
                        <span className="od-line-item__total">{fmt(row.line_total)}</span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className="od-section" aria-labelledby="od-ship-heading">
            <h2 id="od-ship-heading" className="od-section-title">
              <TruckOutlined className="od-section-title__icon" aria-hidden />
              Shipping &amp; tracking
            </h2>
            <FulfillmentPanel order={order} />
          </section>

          <section className="od-section" aria-labelledby="od-addr-heading">
            <h2 id="od-addr-heading" className="od-section-title">
              <HomeOutlined className="od-section-title__icon" aria-hidden />
              Addresses
            </h2>
            <div className="od-address-grid">
              <AddressPanel title="Ship to" icon={<EnvironmentOutlined />} addr={order.shipping_address} />
              <AddressPanel title="Bill to" icon={<HomeOutlined />} addr={order.billing_address} />
            </div>
          </section>
        </div>

        <aside className="od-aside">
          <OrderSummaryAside order={order} />
        </aside>
      </div>
    </div>
  )
}
