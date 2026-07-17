export type ImportExportEntity = "products" | "categories"

export type CategoryImportMode = "create" | "update"

export type CategoryParentReferenceType = "seo_url" | "category_id"

export type CategoryCsvRow = {
  id?: string
  handle?: string
  name: string
  description?: string
  parent_category_id?: string
  parent_handle?: string
  is_active?: boolean
  is_internal?: boolean
  rank?: number
}

export type CategoryImportOptions = {
  mode: CategoryImportMode
  parent_reference_type: CategoryParentReferenceType
  /** When true, validate/count only — do not write */
  dry_run?: boolean
}

export type CategoryImportSummary = {
  created: number
  updated: number
  failed: number
  errors: { row: number; message: string }[]
}

export type CategoryVerifySummary = {
  rows: number
  would_create: number
  would_update: number
  not_found: number
  invalid: number
  missing_parent: number
  conflicts: number
  mode: CategoryImportMode
  parent_reference_type: CategoryParentReferenceType
  samples: {
    id?: string
    handle: string
    name: string
    action: "create" | "update"
  }[]
  errors: { row: number; message: string }[]
}

export type ProductImportMode = "create" | "update"

export const PRODUCT_UPDATE_FIELDS = [
  "status",
  "title",
  "subtitle",
  "description",
  "thumbnail",
  "handle",
  "variant_sku",
  "variant_barcode",
  "variant_price",
  "variant_allow_backorder",
  "variant_manage_inventory",
] as const

export type ProductUpdateField = (typeof PRODUCT_UPDATE_FIELDS)[number]

export type ProductImportOptions = {
  mode: ProductImportMode
  /** Only used when mode is "update" */
  fields?: ProductUpdateField[]
  /** When true, validate/count only — do not write */
  dry_run?: boolean
}

export type ProductImportSummary = {
  created: number
  updated: number
  skipped: number
  failed: number
  errors: { row: number; message: string }[]
}

export type ProductCreateVerifySummary = {
  rows: number
  would_create_products: number
  would_create_variants: number
  missing_sku: number
  missing_handle: number
  missing_title: number
  samples: {
    handle: string
    title: string
    sku: string
    variant_title?: string
  }[]
  errors: { row: number; message: string }[]
}

export type ProductVerifySummary = {
  rows: number
  unique_products: number
  would_update: number
  not_found: number
  invalid: number
  fields: ProductUpdateField[]
  samples: {
    id: string
    handle?: string
    title?: string
    status?: string
  }[]
  missing_ids: string[]
  errors: { row: number; message: string }[]
}

export type ImportExportSummary =
  | CategoryImportSummary
  | CategoryVerifySummary
  | ProductImportSummary
  | Record<string, unknown>

export function isProductImportMode(value: unknown): value is ProductImportMode {
  return value === "create" || value === "update"
}

export function isCategoryImportMode(
  value: unknown
): value is CategoryImportMode {
  return value === "create" || value === "update"
}

export function isCategoryParentReferenceType(
  value: unknown
): value is CategoryParentReferenceType {
  return value === "seo_url" || value === "category_id"
}

export function isProductUpdateField(value: unknown): value is ProductUpdateField {
  return (
    typeof value === "string" &&
    (PRODUCT_UPDATE_FIELDS as readonly string[]).includes(value)
  )
}
