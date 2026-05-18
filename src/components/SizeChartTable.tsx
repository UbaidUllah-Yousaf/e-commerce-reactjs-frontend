import type { SizeChartByTag, SizeChartRowOut } from '../types/catalog'

function sortBySortOrder<T extends { sort_order: number }>(list: T[]): T[] {
  return [...list].sort((a, b) => a.sort_order - b.sort_order)
}

function cellValue(row: SizeChartRowOut, columnId: number): string {
  const v = row.values?.find((c) => c.column_id === columnId)
  return v?.value?.trim() ? v.value : '—'
}

export function SizeChartTable({ chart }: { chart: SizeChartByTag }) {
  const columns = sortBySortOrder(chart.columns ?? [])
  const rows = sortBySortOrder(chart.rows ?? [])

  if (columns.length === 0 || rows.length === 0) {
    return null
  }

  return (
    <div className="ella-size-chart-wrap">
      <table className="ella-size-chart-table">
        <thead>
          <tr>
            <th className="ella-size-chart-table__corner" scope="col" />
            {columns.map((col) => (
              <th key={col.id} scope="col" className="ella-size-chart-table__col-head">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <th scope="row" className="ella-size-chart-table__row-head">
                {row.label}
              </th>
              {columns.map((col) => (
                <td key={`${row.id}-${col.id}`} className="ella-size-chart-table__cell">
                  {cellValue(row, col.id)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="ella-size-chart-footnote">
        Fit may vary by style.
      </p>
    </div>
  )
}
