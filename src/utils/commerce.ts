import type { Checkout, CheckoutTotals, Order } from '../types/commerce'
import { parseMoney } from './catalog'

/** Customer-facing order label (`name` from API, then `order_number`, then `id`). */
export function formatOrderLabel(order: Pick<Order, 'id' | 'name' | 'order_number'>): string {
  const name = order.name?.trim()
  if (name) return name
  if (order.order_number != null && Number.isFinite(order.order_number)) {
    return `#${order.order_number}`
  }
  return `#${order.id}`
}

export function paymentStatusDisplayText(order: Pick<Order, 'financial_status' | 'financial_status_label'>): string {
  const label = order.financial_status_label?.trim()
  if (label) return label
  return order.financial_status === 'paid' ? 'Paid' : 'Payment pending'
}

export function paymentStatusBadgeClasses(financialStatus: string): string {
  return financialStatus === 'paid'
    ? 'account-order-badge account-order-badge--paid'
    : 'account-order-badge account-order-badge--pending'
}

/** Consistent money display for orders / receipts (matches storefront checkout). */
export function formatOrderCurrency(amount: number, currency: string): string {
  const c = (currency || 'USD').toUpperCase()
  if (c === 'PKR') return `Rs ${Math.round(amount).toLocaleString()}`
  return `${c} ${amount.toFixed(2)}`
}

export function lineupSubtotalCheckout(checkout: Checkout | undefined): number {
  const lines = checkout?.line_items ?? []
  let sum = 0
  for (const line of lines) {
    sum += parseMoney(line.unit_price) * line.quantity
  }
  return sum
}

/** Parse `checkout.totals` object or JSON string from API. */
export function parseCheckoutTotals(checkout: Checkout | undefined): CheckoutTotals | null {
  if (!checkout?.totals) return null
  const t = checkout.totals
  if (typeof t === 'object' && t !== null && 'total' in t) {
    const o = t as CheckoutTotals
    return typeof o.total === 'string' ? o : null
  }
  if (typeof t === 'string' && t.trim()) {
    try {
      const o = JSON.parse(t) as CheckoutTotals
      if (o && typeof o.total === 'string') return o
    } catch {
      return null
    }
  }
  return null
}

/** Flat courier rate shown in checkout until API persists shipping. */
export const DEFAULT_CHECKOUT_SHIPPING_PKR = 250

export function checkoutGrandTotal(checkout: Checkout | undefined): number {
  const parsed = parseCheckoutTotals(checkout)
  if (parsed?.total) return parseMoney(parsed.total)
  const shipping = parseMoney(checkout?.shipping_total)
  const tax = parseMoney(checkout?.tax_total)
  const discount = parseMoney(checkout?.discount_amount)
  const gift =
    checkout?.gift_card_applications?.reduce((s, g) => s + parseMoney(g.amount_applied), 0) ?? 0
  const sub = lineupSubtotalCheckout(checkout)
  return Math.max(0, sub + shipping + tax - discount - gift)
}

/** Shipping for UI + payment logic when backend has not set shipping_total yet. */
export function checkoutDisplayShipping(checkout: Checkout | undefined): number {
  const fromApi = parseMoney(checkout?.shipping_total)
  if (fromApi > 0) return fromApi
  return lineupSubtotalCheckout(checkout) > 0 ? DEFAULT_CHECKOUT_SHIPPING_PKR : 0
}

/**
 * Grand total used for payment UI. Prefer line-item math + display shipping over
 * API `totals.total` / `payment_required` when shipping has not been PATCHed yet.
 */
export function checkoutDisplayGrandTotal(checkout: Checkout | undefined): number {
  const sub = lineupSubtotalCheckout(checkout)
  const shipping = checkoutDisplayShipping(checkout)
  const tax = parseMoney(checkout?.tax_total)
  const discount = parseMoney(checkout?.discount_amount)
  const gift =
    checkout?.gift_card_applications?.reduce((s, g) => s + parseMoney(g.amount_applied), 0) ?? 0
  const fromParts = Math.max(0, sub + shipping + tax - discount - gift)

  const parsed = parseCheckoutTotals(checkout)
  const apiTotal = parsed?.total ? parseMoney(parsed.total) : null
  if (apiTotal == null) return fromParts
  if (apiTotal <= 0.005 && fromParts > 0.005) return fromParts
  return apiTotal
}

export function isCheckoutPaymentRequired(checkout: Checkout | undefined): boolean {
  if (!checkout) return true
  const displayTotal = checkoutDisplayGrandTotal(checkout)
  if (displayTotal <= 0.005) return false
  if (typeof checkout.payment_required === 'boolean' && checkout.payment_required) return true
  return displayTotal > 0.005
}

/** Best-effort display for read-only totals blob from backend. */
export function formatTotalsHint(totals: unknown): string | null {
  if (totals == null || totals === '') return null
  if (typeof totals === 'string') {
    const parsed = parseCheckoutTotals({ totals } as Checkout)
    if (parsed?.total) return parsed.total
    return totals.length > 200 ? totals.slice(0, 197) + '…' : totals
  }
  if (typeof totals === 'object' && totals != null && 'total' in totals) {
    return String((totals as { total?: unknown }).total)
  }
  return JSON.stringify(totals)
}

export function normalizePaginated<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) {
    return raw as T[]
  }
  if (
    raw &&
    typeof raw === 'object' &&
    'results' in raw &&
    Array.isArray((raw as { results: unknown }).results)
  ) {
    return (raw as { results: T[] }).results
  }
  throw new Error('Unexpected list payload')
}
