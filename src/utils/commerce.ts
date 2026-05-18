import type { Checkout, Order } from '../types/commerce'
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

/** Best-effort display for read-only totals blob from backend. */
export function formatTotalsHint(totals: unknown): string | null {
  if (totals == null || totals === '') return null
  if (typeof totals === 'string') {
    try {
      const o = JSON.parse(totals) as Record<string, unknown>
      if (o && typeof o === 'object' && typeof o.total === 'string') {
        return String(o.total)
      }
      if (typeof o === 'object' && o != null && 'currency' in o && 'grand_total' in o) {
        return `${String((o as { currency?: string }).currency ?? '')} ${String((o as { grand_total?: string }).grand_total ?? '')}`
      }
      return totals.length > 200 ? totals.slice(0, 197) + '…' : totals
    } catch {
      return totals.length > 200 ? totals.slice(0, 197) + '…' : totals
    }
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
