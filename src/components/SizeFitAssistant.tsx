import { useMemo, useState } from 'react'
import { App as AntdApp, Button, InputNumber, Space, Typography } from 'antd'
import type { Product } from '../types/catalog'
import type { SizeChartByTag } from '../types/catalog'
import { findSizeLikeOption, rankSizeChartRows, suggestSizeFromMeasurements } from '../utils/sizeFitSuggest'

const { Text, Paragraph } = Typography

function sortBySortOrder<T extends { sort_order: number }>(list: T[]): T[] {
  return [...list].sort((a, b) => a.sort_order - b.sort_order)
}

export interface SizeFitAssistantProps {
  chart: SizeChartByTag
  product: Product
  selection: Record<number, number>
  onApplySize: (optionId: number, valueId: number) => void
}

export function SizeFitAssistant({ chart, product, selection, onApplySize }: SizeFitAssistantProps) {
  const { message } = AntdApp.useApp()
  const columns = useMemo(() => sortBySortOrder(chart.columns ?? []), [chart.columns])
  const [measurements, setMeasurements] = useState<Record<number, number | null>>({})
  const [suggestedRow, setSuggestedRow] = useState<string | null>(null)
  const [suggestedValueId, setSuggestedValueId] = useState<number | null>(null)
  const [suggestedOptionId, setSuggestedOptionId] = useState<number | null>(null)

  const sizeOption = useMemo(() => findSizeLikeOption(product), [product])

  const handleSuggest = () => {
    const map = new Map<number, number>()
    for (const col of columns) {
      const v = measurements[col.id]
      if (v != null && Number.isFinite(v)) {
        map.set(col.id, v)
      }
    }

    if (map.size === 0) {
      message.warning('Enter at least one measurement.')
      setSuggestedRow(null)
      setSuggestedValueId(null)
      setSuggestedOptionId(null)
      return
    }

    const match = suggestSizeFromMeasurements(chart, product, map)
    if (match) {
      setSuggestedRow(match.rowLabel)
      setSuggestedValueId(match.value.id)
      setSuggestedOptionId(match.option.id)
      return
    }

    const ranked = rankSizeChartRows(chart, map)
    const best = ranked[0]
    if (best) {
      setSuggestedRow(best.row.label.trim())
      setSuggestedValueId(null)
      setSuggestedOptionId(null)
    } else {
      setSuggestedRow(null)
      setSuggestedValueId(null)
      setSuggestedOptionId(null)
    }
  }

  const canApply =
    suggestedOptionId != null &&
    suggestedValueId != null &&
    selection[suggestedOptionId] !== suggestedValueId

  const alreadyMatches =
    suggestedOptionId != null &&
    suggestedValueId != null &&
    selection[suggestedOptionId] === suggestedValueId

  return (
    <div className="ella-size-fit__assistant">
      <Text strong className="ella-size-fit__title">
        Find your size
      </Text>
      <Paragraph type="secondary" className="ella-size-fit__hint">
        Enter your measurements in the same unit as the chart (often cm). We pick the closest size row; if your
        product has a size option, you can apply it in one tap.
      </Paragraph>

      <div className="ella-size-fit__inputs">
        {columns.map((col) => (
          <label key={col.id} className="ella-size-fit__field">
            <span className="ella-size-fit__label">{col.label}</span>
            <InputNumber
              className="ella-size-fit__input"
              min={0}
              step={0.5}
              placeholder="—"
              value={measurements[col.id] ?? null}
              onChange={(v) =>
                setMeasurements((prev) => ({
                  ...prev,
                  [col.id]: v == null || (typeof v === 'number' && Number.isNaN(v)) ? null : v,
                }))
              }
            />
          </label>
        ))}
      </div>

      <Space wrap className="ella-size-fit__actions" direction="vertical" size="small" style={{ width: '100%' }}>
        <Button type="primary" onClick={handleSuggest}>
          Suggest size
        </Button>
        {suggestedRow ? (
          <Text className="ella-size-fit__result">
            Suggested size: <strong>{suggestedRow}</strong>
            {!sizeOption ? (
              <span className="ella-size-fit__note"> — add a &quot;Size&quot; option on variants to auto-select.</span>
            ) : null}
          </Text>
        ) : null}
      </Space>

      {suggestedRow && suggestedValueId != null && suggestedOptionId != null ? (
        <div className="ella-size-fit__apply">
          {alreadyMatches ? (
            <Text type="success">That size is already selected.</Text>
          ) : (
            <Button type="default" onClick={() => onApplySize(suggestedOptionId, suggestedValueId)} disabled={!canApply}>
              Use {suggestedRow}
            </Button>
          )}
        </div>
      ) : suggestedRow && !suggestedValueId ? (
        <Text type="secondary" className="ella-size-fit__warn">
          We found a chart row, but it doesn’t match any variant value on this product. Choose the closest size
          manually.
        </Text>
      ) : null}
    </div>
  )
}
