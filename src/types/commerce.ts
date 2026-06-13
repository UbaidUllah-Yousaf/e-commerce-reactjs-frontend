/** Checkout / orders from OpenAPI v1 schemas. */

import type { ProductVariant } from './catalog'

export type CheckoutStatus = 'open' | 'completed' | 'cancelled'

export interface CheckoutGiftCardApplication {
  id: number
  checkout: number
  gift_card: number
  gift_card_code: string
  amount_applied: string
  created_at: string
  updated_at: string
}

export interface CheckoutLineItem {
  id: number
  checkout: number
  variant: number
  variant_detail: ProductVariant
  quantity: number
  unit_price: string
  created_at: string
  updated_at: string
  /** When API embeds product name on the line item. */
  product_title?: string
}

export interface CheckoutTotals {
  subtotal?: string
  discount_amount?: string
  shipping_total?: string
  tax_total?: string
  gift_card_total?: string
  total: string
}

export interface Checkout {
  id: number
  token: string
  email?: string
  phone?: string
  currency?: string
  status: CheckoutStatus
  note?: string
  shipping_address?: Record<string, unknown>
  billing_address?: Record<string, unknown>
  billing_same_as_shipping?: boolean
  shipping_total?: string
  tax_total?: string
  discount_code?: number | null
  discount_code_string?: string
  discount_amount?: string
  line_items?: CheckoutLineItem[]
  gift_card_applications?: CheckoutGiftCardApplication[]
  totals?: CheckoutTotals | string | unknown
  payment_required?: boolean
  stripe_enabled?: boolean
  created_at?: string
  updated_at?: string
}

export type FinancialStatus = 'pending' | 'paid'

export interface FulfillmentService {
  id: number
  name: string
  /** Optional slug; not used for tracking URL resolution in the storefront. */
  handle?: string
  courier_name: string
  carrier_code?: string
  tracking_url_template?: string
  /** Carrier / fulfillment profile logo (absolute or site-relative URL). */
  logo?: string | null
  is_active?: boolean
  notes?: string
  created_at: string
  updated_at: string
}

export type FulfillmentStatus =
  | 'pending'
  | 'open'
  | 'in_transit'
  | 'success'
  | 'cancelled'
  | 'error'
  | 'failure'

export interface FulfillmentLineItem {
  id: number
  order_line_item: number
  product_title: string
  variant_title: string
  sku: string
  quantity: number
  created_at: string
  updated_at: string
}

export interface Fulfillment {
  id: number
  order: number
  fulfillment_service?: number | null
  fulfillment_service_detail?: FulfillmentService
  name?: string
  status: FulfillmentStatus
  tracking_company?: string
  tracking_number?: string
  tracking_url?: string
  notify_customer?: boolean
  shipped_at?: string | null
  delivered_at?: string | null
  line_items: FulfillmentLineItem[]
  /** Read-only helper from API when present; may be empty — also check `tracking_url`. */
  effective_tracking_company?: string
  effective_tracking_url?: string
  created_at: string
  updated_at: string
}

export interface OrderLineItem {
  id: number
  variant: number
  product_title: string
  variant_title: string
  sku: string
  quantity: number
  unit_price: string
  line_total: string
  created_at: string
  updated_at: string
  /** Nested variant when order serializer embeds it (image, title, etc.). */
  variant_detail?: ProductVariant
  featured_image?: string | null
  image?: string | null
  variant_image?: string | null
  thumbnail?: string | null
  /** When the API exposes per-line fulfillment (Shopify-style); otherwise derived from `fulfillments`. */
  fulfillment_status?: string | null
  fulfillment_status_label?: string | null
}

export interface Order {
  id: number
  /** Storefront display name (Shopify-style), e.g. `#1001`. */
  name: string
  /** Sequential customer-facing number when `name` is absent. */
  order_number?: number
  checkout: number
  token: string
  email: string
  phone: string
  currency: string
  shipping_address: Record<string, unknown>
  billing_address: Record<string, unknown>
  subtotal: string
  discount_amount: string
  shipping_total: string
  tax_total: string
  gift_card_total: string
  total: string
  discount_code_snapshot: string
  financial_status: FinancialStatus
  financial_status_label?: string
  fulfillment_status: string
  /** Human-readable fulfillment state from API (e.g. Shopify-style label). */
  fulfillment_status_label?: string | null
  note: string
  line_items: OrderLineItem[]
  fulfillments: Fulfillment[]
  created_at: string
  updated_at: string
}
