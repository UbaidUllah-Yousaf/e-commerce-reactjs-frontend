import type { Fulfillment, FulfillmentService, FulfillmentStatus, Order, OrderLineItem } from '../types/commerce'

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

/** Carrier / courier label from fulfillment + embedded service (no handle required). */
export function fulfillmentCarrierLabel(f: Fulfillment): string {
  const raw = f as Fulfillment & Record<string, unknown>
  return (
    str(raw.effective_tracking_company) ||
    str(raw.tracking_company) ||
    str(raw.trackingCompany) ||
    str(f.fulfillment_service_detail?.courier_name) ||
    str(f.fulfillment_service_detail?.name) ||
    ''
  )
}

/**
 * Best-effort tracking URL: explicit fields first, then `tracking_url_template` + tracking number.
 * Does not substitute `handle` — if the template still contains `{…}` placeholders after substitution, returns null.
 */
export function fulfillmentTrackingUrl(f: Fulfillment): string | null {
  const raw = f as Fulfillment & Record<string, unknown>
  const direct =
    str(raw.effective_tracking_url) ||
    str(raw.tracking_url) ||
    str(raw.trackingUrl) ||
    str(raw.track_url) ||
    str(raw.tracking_link)

  if (direct) return direct

  const nestedTrack = raw.tracking
  if (nestedTrack && typeof nestedTrack === 'object' && !Array.isArray(nestedTrack)) {
    const nt = nestedTrack as Record<string, unknown>
    const fromNested = str(nt.url) || str(nt.link) || str(nt.href) || str(nt.tracking_url)
    if (fromNested) return fromNested
  }

  const num =
    str(raw.tracking_number) ||
    str(raw.trackingNumber)

  const tpl = f.fulfillment_service_detail?.tracking_url_template
    ? str(f.fulfillment_service_detail.tracking_url_template)
    : str(raw.tracking_url_template)

  if (tpl && num) {
    if (/\{[^}]+\}/.test(tpl)) {
      const built = tpl
        .replace(/\{tracking_number\}/gi, encodeURIComponent(num))
        .replace(/\{TRACKING_NUMBER\}/g, encodeURIComponent(num))
        .replace(/\{tracking_id\}/gi, encodeURIComponent(num))
        .replace(/\{id\}/gi, encodeURIComponent(num))
      if (/\{[^{}]+\}/.test(built)) return null
      return built
    }
    if (tpl.endsWith('=')) return tpl + encodeURIComponent(num)
  }

  return null
}

/** Logo URL from `fulfillment_service_detail` or top-level fulfillment fields. */
export function fulfillmentServiceLogoUrl(f: Fulfillment): string | undefined {
  const svc = f.fulfillment_service_detail
  if (svc && typeof svc === 'object') {
    const x = svc as FulfillmentService & Record<string, unknown>
    const fromSvc =
      str(x.logo) ||
      str(x.logo_url) ||
      str(x.logoUrl) ||
      str(x.image) ||
      str(x.icon) ||
      str(x.brand_logo)
    if (fromSvc) return fromSvc
  }
  const raw = f as Fulfillment & Record<string, unknown>
  const top =
    str(raw.fulfillment_service_logo) ||
    str(raw.fulfillmentServiceLogo) ||
    str(raw.carrier_logo)
  return top ?? undefined
}

type LineItemExtras = OrderLineItem & Record<string, unknown>

/** First usable product/variant image URL from nested serializer fields. */
export function orderLineItemImageSrc(item: OrderLineItem): string | undefined {
  const x = item as LineItemExtras
  const vd = x.variant_detail
  const fromVariant =
    vd && typeof vd === 'object' && vd !== null && 'image' in vd ? str((vd as { image?: unknown }).image) : null

  const prod = x.product
  const fromProduct =
    prod && typeof prod === 'object' && prod !== null
      ? str((prod as { featured_image?: unknown }).featured_image) ||
        str((prod as { image?: unknown }).image)
      : null

  const pick =
    str(x.featured_image) ||
    str(x.image) ||
    str(x.variant_image) ||
    str(x.thumbnail) ||
    str(x.product_image) ||
    str(x.image_url) ||
    str(x.featuredImage) ||
    fromVariant ||
    fromProduct

  return pick ?? undefined
}

function aggregateFulfillmentStatusesForLine(statuses: FulfillmentStatus[]): string {
  if (statuses.length === 0) return 'unfulfilled'
  if (statuses.some((s) => s === 'error' || s === 'failure')) return 'failure'
  if (statuses.some((s) => s === 'cancelled')) return 'cancelled'
  if (statuses.some((s) => s === 'in_transit')) return 'in_transit'
  if (statuses.some((s) => s === 'open')) return 'open'
  if (statuses.some((s) => s === 'pending')) return 'pending'
  if (statuses.length > 0 && statuses.every((s) => s === 'success')) return 'success'
  if (statuses.some((s) => s === 'success')) return 'open'
  return 'pending'
}

/**
 * Per–line-item fulfillment for badges: prefers explicit API fields, else sums
 * `fulfillments[].line_items` where `order_line_item` matches this line’s `id`.
 */
export function lineItemFulfillmentSnapshot(
  order: Order,
  line: OrderLineItem,
): { fulfillment_status: string; fulfillment_status_label?: string | null } {
  const raw = line as OrderLineItem & Record<string, unknown>
  const direct =
    str(raw.fulfillment_status) ||
    str(raw.fulfillmentStatus) ||
    str(line.fulfillment_status)
  const directLabel =
    str(raw.fulfillment_status_label) ||
    str(raw.fulfillmentStatusLabel) ||
    str(line.fulfillment_status_label)
  if (direct) {
    return { fulfillment_status: direct, fulfillment_status_label: directLabel }
  }

  const perFulfillment = new Map<number, { qty: number; status: FulfillmentStatus }>()
  for (const f of order.fulfillments ?? []) {
    let qtyInShipment = 0
    for (const li of f.line_items ?? []) {
      if (li.order_line_item === line.id && li.quantity > 0) {
        qtyInShipment += li.quantity
      }
    }
    if (qtyInShipment > 0) {
      perFulfillment.set(f.id, { qty: qtyInShipment, status: f.status })
    }
  }

  let fulfilledQty = 0
  for (const v of perFulfillment.values()) {
    fulfilledQty += v.qty
  }

  if (fulfilledQty === 0) {
    return { fulfillment_status: 'unfulfilled', fulfillment_status_label: 'Unfulfilled' }
  }

  if (fulfilledQty < line.quantity) {
    return { fulfillment_status: 'partial', fulfillment_status_label: 'Partially fulfilled' }
  }

  const statuses = [...perFulfillment.values()].map((v) => v.status)
  const machine = aggregateFulfillmentStatusesForLine(statuses)
  const label = machine === 'success' ? 'Fulfilled' : null
  return { fulfillment_status: machine, fulfillment_status_label: label }
}
