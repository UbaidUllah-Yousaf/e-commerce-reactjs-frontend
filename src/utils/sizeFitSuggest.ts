import type {
  Product,
  ProductOption,
  ProductOptionValue,
  SizeChartByTag,
  SizeChartRowOut,
} from '../types/catalog'

/** Pull numeric measurements from a chart cell (e.g. `82-86`, `84 cm`, `32 / 34`). */
export function parseMeasurementCell(raw: string): { low: number; high: number } | null {
  const s = raw.replace(/,/g, '.').replace(/cm|mm|in|″|"|'|\s/gi, ' ')
  const nums = s.match(/\d+(?:\.\d+)?/g)
  if (!nums?.length) return null
  const values = nums.map((n) => Number.parseFloat(n)).filter((x) => Number.isFinite(x))
  if (values.length === 0) return null
  if (values.length === 1) return { low: values[0], high: values[0] }
  const low = Math.min(...values)
  const high = Math.max(...values)
  return { low, high }
}

function cellText(row: SizeChartRowOut, columnId: number): string {
  const v = row.values?.find((c) => c.column_id === columnId)
  return v?.value?.trim() ? v.value : ''
}

/**
 * Score rows by how well user measurements fit parsed ranges (lower is better).
 * Returns sorted candidates with finite scores.
 */
export function rankSizeChartRows(
  chart: SizeChartByTag,
  /** column id → user measurement (same unit as chart) */
  inputs: Map<number, number>,
): { row: SizeChartRowOut; score: number }[] {
  const columns = [...(chart.columns ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  const rows = [...(chart.rows ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  const ranked: { row: SizeChartRowOut; score: number }[] = []

  for (const row of rows) {
    let penalty = 0
    let parts = 0
    for (const col of columns) {
      const user = inputs.get(col.id)
      if (user == null || !Number.isFinite(user)) continue
      const parsed = parseMeasurementCell(cellText(row, col.id))
      if (!parsed) continue
      const halfSpan = Math.max((parsed.high - parsed.low) / 2, 0.5)
      const dist =
        user < parsed.low ? parsed.low - user : user > parsed.high ? user - parsed.high : 0
      penalty += (dist / halfSpan) ** 2
      parts += 1
    }
    if (parts > 0) {
      ranked.push({ row, score: penalty / parts })
    }
  }

  ranked.sort((a, b) => a.score - b.score)
  return ranked
}

function normalizeSizeToken(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[._]/g, ' ')
}

/** PDP option that represents garment size (name heuristic). */
export function findSizeLikeOption(product: Product): ProductOption | null {
  for (const opt of product.options ?? []) {
    const n = opt.name.trim().toLowerCase()
    if (/\bsize\b/.test(n) || /\btaille\b/.test(n) || /\bpointure\b/.test(n)) {
      return opt
    }
  }
  const opts = product.options ?? []
  if (opts.length === 1 && (opts[0].values?.length ?? 0) > 1) {
    return opts[0]
  }
  return null
}

/** Map chart row label (e.g. `M`, `32`) to a variant option value. */
export function matchChartRowToOptionValue(
  rowLabel: string,
  values: ProductOptionValue[],
): ProductOptionValue | null {
  const rl = normalizeSizeToken(rowLabel)
  if (!rl) return null

  for (const v of values) {
    const vv = normalizeSizeToken(v.value)
    if (vv === rl) return v
  }
  for (const v of values) {
    const vv = normalizeSizeToken(v.value)
    if (vv.includes(rl) || rl.includes(vv)) return v
  }

  const oneLetter = rl.match(/^(xxs|xs|s|m|l|xl|xxl|xxxl|\d{1,2})$/i)
  if (oneLetter) {
    const token = oneLetter[1].toLowerCase()
    const synonyms: Record<string, string[]> = {
      xxs: ['2xs', 'double extra small'],
      xs: ['extra small', 'x-small'],
      s: ['small'],
      m: ['medium'],
      l: ['large'],
      xl: ['x-large', 'xlarge', 'extra large'],
      xxl: ['2xl', 'xx-large', 'double xl'],
      xxxl: ['3xl', 'triple xl'],
    }
    const extra = synonyms[token] ?? []
    for (const v of values) {
      const vv = normalizeSizeToken(v.value)
      if (vv === token) return v
      for (const phrase of extra) {
        if (vv === normalizeSizeToken(phrase) || vv.includes(phrase)) return v
      }
    }
  }

  return null
}

export function suggestSizeFromMeasurements(
  chart: SizeChartByTag,
  product: Product,
  inputs: Map<number, number>,
): { rowLabel: string; option: ProductOption; value: ProductOptionValue } | null {
  const ranked = rankSizeChartRows(chart, inputs)
  const best = ranked[0]
  if (!best) return null

  const sizeOpt = findSizeLikeOption(product)
  if (!sizeOpt?.values?.length) {
    return null
  }

  const value = matchChartRowToOptionValue(best.row.label, sizeOpt.values)
  if (!value) return null

  return { rowLabel: best.row.label.trim(), option: sizeOpt, value }
}
