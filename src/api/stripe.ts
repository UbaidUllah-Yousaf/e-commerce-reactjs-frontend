import { apiGet, apiPost } from './client'
import type { Order } from '../types/commerce'

export interface StripeCheckoutUrls {
  success_url?: string
  cancel_url?: string
}

export interface StripeOperationalStatus {
  stripe_checkout_enabled?: boolean
  stripe_keys_configured?: boolean
  stripe_checkout_available?: boolean
  unavailable_reason?: string
}

export interface StripePaymentOptions {
  stripe_checkout: boolean
  stripe_checkout_available?: boolean
  stripe_keys_configured?: boolean
  stripe_unavailable_reason?: string
  /** Cash on delivery — `POST .../complete/` for paid carts; order stays `pending`. */
  cod: boolean
  /** @deprecated API alias — use `cod` */
  manual_complete?: boolean
  zero_total_complete: boolean
  default_success_url?: string
  default_cancel_url?: string
  effective_checkout_urls?: StripeCheckoutUrls
  generated_checkout_urls?: StripeCheckoutUrls
}

export interface StripeConfig {
  /** Stripe Checkout operational. */
  enabled: boolean
  publishable_key: string | null
  stripe?: StripeOperationalStatus
  payment_options: StripePaymentOptions
}

export interface StripePaymentSession {
  checkout_url: string
  session_id: string
  publishable_key?: string
}

export async function fetchStripeConfig(): Promise<StripeConfig> {
  return apiGet<StripeConfig>('/stripe/config/')
}

export async function createCheckoutPaymentSession(
  checkoutId: number,
  body: { success_url?: string; cancel_url?: string } = {},
): Promise<StripePaymentSession> {
  return apiPost<StripePaymentSession>(`/checkouts/${checkoutId}/payment-session/`, body)
}

export async function confirmStripeSession(sessionId: string): Promise<Order> {
  return apiGet<Order>(`/stripe/session/${encodeURIComponent(sessionId)}/confirm/`)
}
