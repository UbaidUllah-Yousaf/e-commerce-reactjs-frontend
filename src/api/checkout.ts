import { apiGet, apiPatch, apiPost } from './client'
import type { Checkout, CheckoutLineItem } from '../types/commerce'

export async function createCheckout(body: Partial<Checkout> = {}): Promise<Checkout> {
  return apiPost<Checkout>('/checkouts/', body)
}

export async function fetchCheckout(id: number): Promise<Checkout> {
  return apiGet<Checkout>(`/checkouts/${id}/`)
}

export async function patchCheckout(id: number, patch: Partial<Checkout>): Promise<Checkout> {
  return apiPatch<Checkout>(`/checkouts/${id}/`, patch)
}

export async function createCheckoutLineItem(
  payload: Pick<CheckoutLineItem, 'checkout' | 'variant' | 'quantity'>,
): Promise<CheckoutLineItem> {
  return apiPost<CheckoutLineItem>('/checkout-line-items/', payload)
}

export async function patchCheckoutLineItem(
  id: number,
  patch: Partial<Pick<CheckoutLineItem, 'quantity'>>,
): Promise<CheckoutLineItem> {
  return apiPatch<CheckoutLineItem>(`/checkout-line-items/${id}/`, patch)
}

/** Backend may merge fields from partial Checkout payloads on custom routes. */

export async function applyDiscountCheckout(
  checkoutId: number,
  discountCodeOrBody: string | Record<string, unknown>,
): Promise<Checkout> {
  const body =
    typeof discountCodeOrBody === 'string'
      ? { discount_code_string: discountCodeOrBody.trim(), code: discountCodeOrBody.trim() }
      : discountCodeOrBody
  return apiPost<Checkout>(`/checkouts/${checkoutId}/apply-discount/`, body)
}

export async function removeDiscountCheckout(checkoutId: number): Promise<Checkout> {
  return apiPost<Checkout>(`/checkouts/${checkoutId}/remove-discount/`, {})
}

export async function applyGiftCardCheckout(
  checkoutId: number,
  codeOrBody: string | Record<string, unknown>,
): Promise<Checkout> {
  const body =
    typeof codeOrBody === 'string'
      ? { gift_card_code: codeOrBody.trim(), code: codeOrBody.trim() }
      : codeOrBody
  return apiPost<Checkout>(`/checkouts/${checkoutId}/apply-gift-card/`, body)
}

export async function removeGiftCardCheckout(checkoutId: number): Promise<Checkout> {
  return apiPost<Checkout>(`/checkouts/${checkoutId}/remove-gift-card/`, {})
}

/** Snapshot is merged on complete by many backends; avoid posting an empty body. */
export async function completeCheckout(checkoutId: number, snapshot: Partial<Checkout> = {}): Promise<Checkout> {
  return apiPost<Checkout>(`/checkouts/${checkoutId}/complete/`, { ...snapshot })
}
