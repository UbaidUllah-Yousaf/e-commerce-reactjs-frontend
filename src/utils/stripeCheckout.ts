import type { StripeConfig } from '../api/stripe'

export function resolveStripeCheckoutUrls(config: StripeConfig | undefined): {
  success_url: string
  cancel_url: string
} {
  const effective = config?.payment_options?.effective_checkout_urls
  const generated = config?.payment_options?.generated_checkout_urls
  const success =
    effective?.success_url?.trim() ||
    generated?.success_url?.trim() ||
    config?.payment_options?.default_success_url?.trim()
  const cancel =
    effective?.cancel_url?.trim() ||
    generated?.cancel_url?.trim() ||
    config?.payment_options?.default_cancel_url?.trim()

  if (success && cancel) {
    return { success_url: success, cancel_url: cancel }
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return {
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout/cancel`,
  }
}

export type CheckoutPaymentMode = 'stripe' | 'cod'

function paymentOptionsCod(config: StripeConfig | undefined): boolean {
  const opts = config?.payment_options
  if (!opts) return false
  if (typeof opts.cod === 'boolean') return opts.cod
  return Boolean(opts.manual_complete)
}

/** Stripe Checkout can accept `payment-session` (keys + admin). */
export function isStripeCheckoutAvailable(config: StripeConfig | undefined): boolean {
  if (!config) return false
  if (config.enabled) return true
  const opts = config.payment_options
  if (opts?.stripe_checkout_available === true) return true
  if (config.stripe?.stripe_checkout_available === true) return true
  return false
}

/** Stripe enabled in admin (may still be unavailable without keys). */
export function isStripeCheckoutEnabledInAdmin(config: StripeConfig | undefined): boolean {
  if (!config) return false
  const opts = config.payment_options
  if (opts?.stripe_checkout) return true
  return Boolean(config.stripe?.stripe_checkout_enabled)
}

export function isCodAvailable(config: StripeConfig | undefined): boolean {
  return paymentOptionsCod(config)
}

export function availablePaymentModes(config: StripeConfig | undefined): CheckoutPaymentMode[] {
  const modes: CheckoutPaymentMode[] = []
  if (isStripeCheckoutAvailable(config)) {
    modes.push('stripe')
  }
  if (isCodAvailable(config)) {
    modes.push('cod')
  }
  return modes
}

export function defaultPaymentMode(config: StripeConfig | undefined): CheckoutPaymentMode {
  const modes = availablePaymentModes(config)
  if (modes.includes('stripe')) return 'stripe'
  if (modes.includes('cod')) return 'cod'
  return 'stripe'
}
