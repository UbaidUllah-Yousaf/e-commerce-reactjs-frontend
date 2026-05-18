/**
 * Shopify Admin–style fulfillment status → badge modifier + display label.
 * Colors follow Shopify Polaris / order resource tones (success, warning, critical, subdued).
 */

function normalizeStatusKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_')
}

function humanize(raw: string): string {
  if (!raw?.trim()) return '—'
  return raw
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

/** CSS modifier for `.od-ff-badge--{modifier}` (Shopify-aligned palette in `orderDetail.css`). */
export function fulfillmentStatusBadgeModifier(machineStatus: string): string {
  const k = normalizeStatusKey(machineStatus)
  if (['success', 'fulfilled', 'delivered', 'complete', 'completed'].includes(k)) return 'fulfilled'
  if (['pending', 'unfulfilled', 'awaiting_shipment', 'none'].includes(k)) return 'unfulfilled'
  if (['open', 'processing', 'confirmed'].includes(k)) return 'open'
  if (['in_transit', 'on_the_way', 'shipped', 'out_for_delivery'].includes(k)) return 'in_transit'
  if (['partial', 'partially_fulfilled'].includes(k)) return 'partial'
  if (['scheduled', 'preorder'].includes(k)) return 'scheduled'
  if (['on_hold', 'hold'].includes(k)) return 'on_hold'
  if (['cancelled', 'canceled', 'restocked'].includes(k)) return 'cancelled'
  if (['error', 'failure', 'failed'].includes(k)) return 'critical'
  return 'default'
}

export function fulfillmentStatusBadgeClasses(machineStatus: string): string {
  return `od-ff-badge od-ff-badge--${fulfillmentStatusBadgeModifier(machineStatus)}`
}

export function fulfillmentStatusDisplayText(row: {
  fulfillment_status: string
  fulfillment_status_label?: string | null
}): string {
  const label = row.fulfillment_status_label?.trim()
  if (label) return label
  return humanize(row.fulfillment_status)
}
