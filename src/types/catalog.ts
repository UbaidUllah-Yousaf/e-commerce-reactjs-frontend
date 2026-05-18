/** Mirrors `components/schemas` from the Django OpenAPI spec (drf-spectacular). */

export type StatusEnum = 'draft' | 'active' | 'archived'

export interface Tag {
  id: number
  created_at: string
  updated_at: string
  name: string
}

/** `GET /size-charts/by-tag/?name=` — active chart for a tag (OpenAPI `SizeChartByTag`). */
export interface SizeChartTag {
  id: number
  name: string
}

export interface SizeChartColumnOut {
  id: number
  sort_order: number
  label: string
}

export interface SizeChartCellValue {
  column_id: number
  value: string
}

export interface SizeChartRowOut {
  id: number
  sort_order: number
  label: string
  values: SizeChartCellValue[]
}

export interface SizeChartByTag {
  tag: SizeChartTag
  title: string
  columns: SizeChartColumnOut[]
  rows: SizeChartRowOut[]
}

export interface Collection {
  id: number
  products_count: string
  created_at: string
  updated_at: string
  title: string
  handle?: string
  description?: string
  image?: string | null
  is_active?: boolean
}

export interface ProductOptionValue {
  id: number
  created_at: string
  updated_at: string
  value: string
  option: number
}

export interface ProductOption {
  id: number
  values: ProductOptionValue[]
  created_at: string
  updated_at: string
  name: string
  product: number
}

export interface ProductVariant {
  id: number
  option_values: ProductOptionValue[]
  created_at: string
  updated_at: string
  title: string
  sku?: string | null
  barcode?: string | null
  price: string
  compare_at_price?: string | null
  cost_per_item?: string | null
  inventory_quantity: number
  weight?: string
  is_active: boolean
  image?: string | null
  product: number
  /** Some serializers embed this on nested variant objects (checkout line items). */
  product_title?: string
}

export interface Product {
  id: number
  /** List/detail serializers may return a nested object, a raw PK (number), or omit the field. */
  collection?: Collection | number | string | null
  /** May be omitted in some list responses; normalize with `?? []` at use sites. */
  tags?: Tag[]
  variants?: ProductVariant[]
  options?: ProductOption[]
  min_price: string
  max_price: string
  created_at: string
  updated_at: string
  title: string
  handle?: string
  description: string
  featured_image?: string | null
  vendor?: string
  product_type?: string
  status: StatusEnum
  is_published: boolean
}
