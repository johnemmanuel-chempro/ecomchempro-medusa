import {
  ContainerRegistrationKeys,
  CSVNormalizer,
  MedusaError,
  productValidators,
} from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import {
  batchProductsWorkflow,
  createProductCategoriesWorkflow,
  updateProductCategoriesWorkflow,
  updateProductVariantsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows"
import type {
  CategoryCsvRow,
  CategoryImportOptions,
  CategoryImportSummary,
  CategoryParentReferenceType,
  CategoryVerifySummary,
  ImportExportEntity,
  ProductImportOptions,
  ProductImportSummary,
  ProductCreateVerifySummary,
  ProductUpdateField,
  ProductVerifySummary,
} from "./types"
import { cellToString, parseBoolean, parseCsv, pickRowValue, slugify, stringifyCsv } from "./csv"
import { getTemplate } from "./templates"

const CATEGORY_HEADERS = [
  "Category Id",
  "SEO URL",
  "Category Name",
  "Category Description",
  "Parent Category Id",
  "Parent SEO URL",
  "Is Active",
  "Is Internal",
  "Rank",
]

const PRODUCT_BASE_HEADERS = [
  "Product Id",
  "Product Handle",
  "Product Title",
  "Product Subtitle",
  "Product Description",
  "Product Status",
  "Product Thumbnail",
  "Variant Id",
  "Variant Title",
  "Variant SKU",
  "Variant Barcode",
  "Variant Allow Backorder",
  "Variant Manage Inventory",
  "Variant Price AUD",
]

/** Medusa CSV import accepts Variant Option N Name/Value for N = 1, 2, 3, ... */
const MIN_VARIANT_OPTION_COLUMNS = 3

function variantOptionHeaders(count: number): string[] {
  const headers: string[] = []
  for (let i = 1; i <= count; i++) {
    headers.push(`Variant Option ${i} Name`, `Variant Option ${i} Value`)
  }
  return headers
}

function buildProductHeaders(optionCount: number): string[] {
  return [
    ...PRODUCT_BASE_HEADERS,
    ...variantOptionHeaders(Math.max(optionCount, MIN_VARIANT_OPTION_COLUMNS)),
  ]
}

type ProductOption = {
  id: string
  title?: string | null
}

type VariantOption = {
  option_id?: string | null
  value?: string | null
  option?: { title?: string | null } | null
}

/**
 * Resolve options in product-option order (Size, Color, …) so every variant
 * row uses the same Option N columns. Matching by option_id avoids dropping
 * Color when `variants.options.option` is missing from the query result.
 */
function variantOptionsToColumns(
  productOptions: ProductOption[],
  variantOptions: VariantOption[],
  optionCount: number
): Record<string, string> {
  const columns: Record<string, string> = {}
  const slots = Math.max(optionCount, MIN_VARIANT_OPTION_COLUMNS)
  const byOptionId = new Map(
    variantOptions
      .filter((option) => option.option_id)
      .map((option) => [String(option.option_id), option])
  )

  for (let i = 0; i < slots; i++) {
    const productOption = productOptions[i]
    const variantOption = productOption
      ? byOptionId.get(productOption.id)
      : variantOptions[i]

    const name =
      productOption?.title ??
      variantOption?.option?.title ??
      ""
    const value = variantOption?.value ?? ""

    // Medusa CSV import rejects option name columns with empty values.
    if (!String(value).trim()) {
      columns[`Variant Option ${i + 1} Name`] = ""
      columns[`Variant Option ${i + 1} Value`] = ""
      continue
    }

    columns[`Variant Option ${i + 1} Name`] = String(name)
    columns[`Variant Option ${i + 1} Value`] = String(value)
  }

  return columns
}

type CategoryRecord = {
  id: string
  name: string
  handle: string
  description?: string | null
  parent_category_id?: string | null
  is_active?: boolean
  is_internal?: boolean
  rank?: number | null
}

export default class ImportExportModuleService {
  getTemplate(entity: ImportExportEntity) {
    return getTemplate(entity)
  }

  async exportCategories(container: MedusaContainer): Promise<string> {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: categories } = await query.graph({
      entity: "product_category",
      fields: [
        "id",
        "name",
        "handle",
        "description",
        "parent_category_id",
        "is_active",
        "is_internal",
        "rank",
        "parent_category.handle",
      ],
    })

    const rows = (
      categories as Array<
        CategoryRecord & { parent_category?: { handle?: string | null } | null }
      >
    ).map((category) => ({
      "Category Id": category.id,
      "SEO URL": category.handle,
      "Category Name": category.name,
      "Category Description": category.description ?? "",
      "Parent Category Id": category.parent_category_id ?? "",
      "Parent SEO URL": category.parent_category?.handle ?? "",
      "Is Active": category.is_active ?? true,
      "Is Internal": category.is_internal ?? false,
      Rank: category.rank ?? 0,
    }))

    return stringifyCsv(CATEGORY_HEADERS, rows)
  }

  async exportProducts(container: MedusaContainer): Promise<string> {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: products } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "handle",
        "title",
        "subtitle",
        "description",
        "status",
        "thumbnail",
        "options.id",
        "options.title",
        "variants.id",
        "variants.title",
        "variants.sku",
        "variants.barcode",
        "variants.allow_backorder",
        "variants.manage_inventory",
        "variants.prices.amount",
        "variants.prices.currency_code",
        "variants.options.option_id",
        "variants.options.value",
        "variants.options.option.title",
      ],
    })

    let maxOptionCount = 0
    for (const product of products as Array<Record<string, unknown>>) {
      const productOptions = (product.options as ProductOption[]) ?? []
      maxOptionCount = Math.max(maxOptionCount, productOptions.length)

      const variants = (product.variants as Array<Record<string, unknown>>) ?? []
      for (const variant of variants) {
        const options = (variant.options as VariantOption[]) ?? []
        maxOptionCount = Math.max(maxOptionCount, options.length)
      }
    }

    const headers = buildProductHeaders(maxOptionCount)
    const rows: Record<string, string>[] = []

    for (const product of products as Array<Record<string, unknown>>) {
      const productOptions = (product.options as ProductOption[]) ?? []
      const variants = (product.variants as Array<Record<string, unknown>>) ?? []

      if (!variants.length) {
        rows.push({
          "Product Id": String(product.id ?? ""),
          "Product Handle": String(product.handle ?? ""),
          "Product Title": String(product.title ?? ""),
          "Product Subtitle": String(product.subtitle ?? ""),
          "Product Description": String(product.description ?? ""),
          "Product Status": String(product.status ?? "draft"),
          "Product Thumbnail": String(product.thumbnail ?? ""),
          ...variantOptionsToColumns(productOptions, [], maxOptionCount),
        })
        continue
      }

      for (const variant of variants) {
        const prices = (variant.prices as Array<Record<string, unknown>>) ?? []
        const audPrice = prices.find((price) => price.currency_code === "aud")
        const options = (variant.options as VariantOption[]) ?? []

        rows.push({
          "Product Id": String(product.id ?? ""),
          "Product Handle": String(product.handle ?? ""),
          "Product Title": String(product.title ?? ""),
          "Product Subtitle": String(product.subtitle ?? ""),
          "Product Description": String(product.description ?? ""),
          "Product Status": String(product.status ?? "draft"),
          "Product Thumbnail": String(product.thumbnail ?? ""),
          "Variant Id": String(variant.id ?? ""),
          "Variant Title": String(variant.title ?? ""),
          "Variant SKU": String(variant.sku ?? ""),
          "Variant Barcode": String(variant.barcode ?? ""),
          "Variant Allow Backorder": String(variant.allow_backorder ?? false),
          "Variant Manage Inventory": String(variant.manage_inventory ?? true),
          "Variant Price AUD": audPrice?.amount
            ? String(Number(audPrice.amount))
            : "",
          ...variantOptionsToColumns(productOptions, options, maxOptionCount),
        })
      }
    }

    return stringifyCsv(headers, rows)
  }

  async exportEntity(
    container: MedusaContainer,
    entity: ImportExportEntity
  ): Promise<string> {
    if (entity === "categories") {
      return this.exportCategories(container)
    }

    if (entity === "products") {
      return this.exportProducts(container)
    }

    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Unsupported export entity: ${entity}`
    )
  }

  parseCategoryRows(content: string): CategoryCsvRow[] {
    const records = parseCsv(content)

    return records.map((record) => {
      const name =
        pickRowValue(record, "Category Name", "name", "Name") || ""

      const handle =
        pickRowValue(
          record,
          "SEO URL",
          "Category Handle",
          "handle",
          "seo url",
          "seo_url"
        ) || (name ? slugify(name) : "")

      const parentCategoryId = pickRowValue(
        record,
        "Parent Category Id",
        "parent_category_id",
        "Parent Category ID"
      )
      const parentHandle = pickRowValue(
        record,
        "Parent SEO URL",
        "Parent Handle",
        "parent_handle",
        "parent seo url",
        "parent_seo_url"
      )

      const rankValue = pickRowValue(record, "Rank", "rank")
      const rankNumber = rankValue ? Number(rankValue) : undefined

      return {
        id: pickRowValue(record, "Category Id", "id") || undefined,
        handle,
        name,
        description:
          pickRowValue(record, "Category Description", "description") ||
          undefined,
        parent_category_id: parentCategoryId || undefined,
        parent_handle: parentHandle || undefined,
        is_active: parseBoolean(
          pickRowValue(record, "Is Active", "is_active") || undefined
        ),
        is_internal: parseBoolean(
          pickRowValue(record, "Is Internal", "is_internal") || undefined
        ),
        rank:
          rankNumber !== undefined && Number.isFinite(rankNumber)
            ? rankNumber
            : undefined,
      }
    })
  }

  private resolveCategoryParentRef(
    row: CategoryCsvRow,
    parentReferenceType: CategoryParentReferenceType
  ): { parentCategoryId?: string; parentHandle?: string } {
    if (parentReferenceType === "category_id") {
      return row.parent_category_id
        ? { parentCategoryId: row.parent_category_id }
        : {}
    }

    return row.parent_handle ? { parentHandle: row.parent_handle } : {}
  }

  private async planCategoryImport(
    container: MedusaContainer,
    content: string,
    options: CategoryImportOptions
  ): Promise<{
    summary: CategoryVerifySummary
    operations: {
      rowNumber: number
      action: "create" | "update"
      existingId?: string
      payload: {
        name: string
        handle: string
        description?: string
        is_active: boolean
        is_internal: boolean
        rank: number
      }
      parentCategoryId?: string
      parentHandle?: string
    }[]
  }> {
    const rows = this.parseCategoryRows(content)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: existingCategories } = await query.graph({
      entity: "product_category",
      fields: ["id", "handle", "name"],
    })

    const categoriesByHandle = new Map<string, CategoryRecord>()
    const categoriesById = new Map<string, CategoryRecord>()

    for (const category of existingCategories as CategoryRecord[]) {
      categoriesByHandle.set(category.handle, category)
      categoriesById.set(category.id, category)
    }

    type DraftOperation = {
      rowNumber: number
      action: "create" | "update"
      existingId?: string
      payload: {
        name: string
        handle: string
        description?: string
        is_active: boolean
        is_internal: boolean
        rank: number
      }
      parentCategoryId?: string
      parentHandle?: string
      rowErrors: string[]
      hasConflict: boolean
      hasNotFound: boolean
      hasMissingParent: boolean
    }

    const drafts: DraftOperation[] = []
    const fileHandles = new Set<string>()
    const fileIds = new Set<string>()

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index]
      const rowNumber = index + 2
      const rowErrors: string[] = []
      let hasConflict = false
      let hasNotFound = false

      if (!row.name) {
        rowErrors.push("Category Name is required")
      }

      if (!row.handle) {
        rowErrors.push("SEO URL is required")
      }

      if (
        row.rank !== undefined &&
        (!Number.isFinite(row.rank) || !Number.isInteger(row.rank))
      ) {
        rowErrors.push("Rank must be a whole number")
      }

      if (options.mode === "update") {
        if (!row.id) {
          rowErrors.push("Category Id is required for update mode")
        } else if (!categoriesById.has(row.id)) {
          hasNotFound = true
          rowErrors.push(`Category Id "${row.id}" was not found`)
        } else if (fileIds.has(row.id)) {
          hasConflict = true
          rowErrors.push(`Duplicate Category Id "${row.id}" in this file`)
        } else if (row.name && row.handle) {
          fileIds.add(row.id)
        }
      } else if (row.handle) {
        if (categoriesByHandle.has(row.handle)) {
          hasConflict = true
          rowErrors.push(
            `SEO URL "${row.handle}" already exists (use update mode)`
          )
        } else if (fileHandles.has(row.handle)) {
          hasConflict = true
          rowErrors.push(
            `Duplicate SEO URL "${row.handle}" in this file`
          )
        } else if (row.name) {
          // Only identity-valid create rows can be parent targets in-file.
          // Category Id is ignored in create mode (same as products).
          fileHandles.add(row.handle)
        }
      }

      if (
        options.parent_reference_type === "category_id" &&
        row.parent_handle &&
        !row.parent_category_id
      ) {
        rowErrors.push(
          "Parent SEO URL is ignored; fill Parent Category Id for the selected parent method"
        )
      }

      if (
        options.parent_reference_type === "seo_url" &&
        row.parent_category_id &&
        !row.parent_handle
      ) {
        rowErrors.push(
          "Parent Category Id is ignored; fill Parent SEO URL for the selected parent method"
        )
      }

      const parentRef = this.resolveCategoryParentRef(
        row,
        options.parent_reference_type
      )

      drafts.push({
        rowNumber,
        action: options.mode === "create" ? "create" : "update",
        existingId: options.mode === "update" ? row.id : undefined,
        payload: {
          name: row.name,
          handle: row.handle || "",
          description: row.description,
          is_active: row.is_active ?? true,
          is_internal: row.is_internal ?? false,
          rank: row.rank ?? 0,
        },
        parentCategoryId: parentRef.parentCategoryId,
        parentHandle: parentRef.parentHandle,
        rowErrors,
        hasConflict,
        hasNotFound,
        hasMissingParent: false,
      })
    }

    for (const draft of drafts) {
      if (draft.parentCategoryId) {
        const parentExists = categoriesById.has(draft.parentCategoryId)

        if (!parentExists) {
          draft.hasMissingParent = true
          draft.rowErrors.push(
            `Parent Category Id "${draft.parentCategoryId}" was not found`
          )
        } else if (
          draft.existingId &&
          draft.parentCategoryId === draft.existingId
        ) {
          draft.rowErrors.push("A category cannot be its own parent")
        }
      }

      if (draft.parentHandle) {
        const parentExists =
          categoriesByHandle.has(draft.parentHandle) ||
          fileHandles.has(draft.parentHandle)

        if (!parentExists) {
          draft.hasMissingParent = true
          draft.rowErrors.push(
            `Parent SEO URL "${draft.parentHandle}" was not found`
          )
        } else if (
          draft.payload.handle &&
          draft.parentHandle === draft.payload.handle
        ) {
          draft.rowErrors.push("A category cannot be its own parent")
        }
      }
    }

    const errors: { row: number; message: string }[] = []
    const operations: {
      rowNumber: number
      action: "create" | "update"
      existingId?: string
      payload: {
        name: string
        handle: string
        description?: string
        is_active: boolean
        is_internal: boolean
        rank: number
      }
      parentCategoryId?: string
      parentHandle?: string
    }[] = []

    let wouldCreate = 0
    let wouldUpdate = 0
    let notFound = 0
    let invalid = 0
    let missingParent = 0
    let conflicts = 0

    for (const draft of drafts) {
      if (draft.hasNotFound) {
        notFound++
      }
      if (draft.hasConflict) {
        conflicts++
      }
      if (draft.hasMissingParent) {
        missingParent++
      }

      if (draft.rowErrors.length) {
        invalid++
        for (const message of draft.rowErrors) {
          errors.push({ row: draft.rowNumber, message })
        }
        continue
      }

      if (draft.action === "create") {
        wouldCreate++
      } else {
        wouldUpdate++
      }

      operations.push({
        rowNumber: draft.rowNumber,
        action: draft.action,
        existingId: draft.existingId,
        payload: draft.payload,
        parentCategoryId: draft.parentCategoryId,
        parentHandle: draft.parentHandle,
      })
    }

    const samples = operations.slice(0, 5).map((operation) => ({
      id: operation.existingId,
      handle: operation.payload.handle,
      name: operation.payload.name,
      action: operation.action,
    }))

    return {
      summary: {
        rows: rows.length,
        would_create: wouldCreate,
        would_update: wouldUpdate,
        not_found: notFound,
        invalid,
        missing_parent: missingParent,
        conflicts,
        mode: options.mode,
        parent_reference_type: options.parent_reference_type,
        samples,
        errors,
      },
      operations,
    }
  }

  async importCategories(
    container: MedusaContainer,
    content: string,
    options: CategoryImportOptions
  ): Promise<
    | { kind: "verify"; summary: CategoryVerifySummary }
    | { kind: "result"; summary: CategoryImportSummary }
  > {
    const plan = await this.planCategoryImport(container, content, options)

    if (options.dry_run) {
      return { kind: "verify", summary: plan.summary }
    }

    if (plan.summary.errors.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Category import has ${plan.summary.errors.length} validation error(s). Verify the file first.`
      )
    }

    if (!plan.operations.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "No categories to import from the uploaded CSV"
      )
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: existingCategories } = await query.graph({
      entity: "product_category",
      fields: ["id", "handle", "name"],
    })

    const categoriesByHandle = new Map<string, CategoryRecord>()
    const categoriesById = new Map<string, CategoryRecord>()

    for (const category of existingCategories as CategoryRecord[]) {
      categoriesByHandle.set(category.handle, category)
      categoriesById.set(category.id, category)
    }

    const summary: CategoryImportSummary = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: [],
    }

    const pendingParentLinks: {
      categoryId: string
      parentCategoryId?: string
      parentHandle?: string
      row: number
    }[] = []

    for (const operation of plan.operations) {
      try {
        if (operation.action === "update" && operation.existingId) {
          await updateProductCategoriesWorkflow(container).run({
            input: {
              selector: { id: operation.existingId },
              update: operation.payload,
            },
          })

          const updated: CategoryRecord = {
            id: operation.existingId,
            name: operation.payload.name,
            handle: operation.payload.handle,
          }
          categoriesById.set(updated.id, updated)
          categoriesByHandle.set(updated.handle, updated)
          summary.updated++

          if (operation.parentCategoryId || operation.parentHandle) {
            pendingParentLinks.push({
              categoryId: operation.existingId,
              parentCategoryId: operation.parentCategoryId,
              parentHandle: operation.parentHandle,
              row: operation.rowNumber,
            })
          }
        } else {
          const { result } = await createProductCategoriesWorkflow(container).run({
            input: {
              product_categories: [operation.payload],
            },
          })

          const created = result[0]
          if (!created) {
            throw new Error("Category create did not return a result")
          }

          categoriesByHandle.set(created.handle, created as CategoryRecord)
          categoriesById.set(created.id, created as CategoryRecord)
          summary.created++

          if (operation.parentCategoryId || operation.parentHandle) {
            pendingParentLinks.push({
              categoryId: created.id,
              parentCategoryId: operation.parentCategoryId,
              parentHandle: operation.parentHandle,
              row: operation.rowNumber,
            })
          }
        }
      } catch (error) {
        summary.failed++
        summary.errors.push({
          row: operation.rowNumber,
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    for (const link of pendingParentLinks) {
      try {
        const parent =
          (link.parentCategoryId &&
            categoriesById.get(link.parentCategoryId)) ||
          (link.parentHandle && categoriesByHandle.get(link.parentHandle)) ||
          null

        if (!parent) {
          const ref =
            link.parentCategoryId ||
            link.parentHandle ||
            "unknown"
          throw new Error(`Parent category "${ref}" was not found`)
        }

        await updateProductCategoriesWorkflow(container).run({
          input: {
            selector: { id: link.categoryId },
            update: {
              parent_category_id: parent.id,
            },
          },
        })
      } catch (error) {
        summary.failed++
        summary.errors.push({
          row: link.row,
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    return { kind: "result", summary }
  }

  /**
   * Product import with explicit create/update mode.
   * Update mode only patches selected fields and never touches variant options
   * (avoids Medusa's unique option-combination failures on status-only imports).
   */
  async importProducts(
    container: MedusaContainer,
    content: string,
    options: ProductImportOptions
  ): Promise<
    | { kind: "preview"; transaction_id: string; summary: Record<string, unknown> }
    | { kind: "verify"; summary: ProductVerifySummary | ProductCreateVerifySummary }
    | { kind: "result"; summary: ProductImportSummary }
  > {
    if (options.mode === "create") {
      if (options.dry_run) {
        const summary = this.verifyProductCreates(content)
        return { kind: "verify", summary }
      }

      // Use our string-safe CSV parse (same as verify), then Medusa's
      // CSVNormalizer + batch create — avoids Medusa's csv2json turning
      // numeric SKUs back into numbers before CreateProduct validation.
      const create = this.buildCreateProductsFromCsv(content)

      if (!create.length) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "No products to create from the uploaded CSV"
        )
      }

      const { result } = await batchProductsWorkflow(container).run({
        input: {
          create,
          update: [],
          delete: [],
        },
      })

      return {
        kind: "result",
        summary: {
          created: result.created?.length ?? create.length,
          updated: 0,
          skipped: 0,
          failed: 0,
          errors: [],
        },
      }
    }

    const fields = options.fields?.length
      ? options.fields
      : (["status"] as ProductUpdateField[])

    if (options.dry_run) {
      const summary = await this.verifyProductUpdates(container, content, fields)
      return { kind: "verify", summary }
    }

    const summary = await this.updateProductsFromCsv(container, content, fields)
    return { kind: "result", summary }
  }

  async verifyProductUpdates(
    container: MedusaContainer,
    content: string,
    fields: ProductUpdateField[]
  ): Promise<ProductVerifySummary> {
    const { patches, errors, rows } = this.buildProductUpdatePatches(content, fields)
    const productIds = patches.map((patch) => patch.id)

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const existingById = new Map<string, { id: string; handle?: string; title?: string; status?: string }>()

    if (productIds.length) {
      const { data: existing } = await query.graph({
        entity: "product",
        fields: ["id", "handle", "title", "status"],
        filters: { id: productIds },
      })

      for (const product of existing as Array<{
        id: string
        handle?: string
        title?: string
        status?: string
      }>) {
        existingById.set(product.id, product)
      }
    }

    const missing_ids: string[] = []
    const wouldUpdate: typeof patches = []

    for (const patch of patches) {
      if (!existingById.has(patch.id)) {
        missing_ids.push(patch.id)
        continue
      }
      wouldUpdate.push(patch)
    }

    return {
      rows,
      unique_products: patches.length,
      would_update: wouldUpdate.length,
      not_found: missing_ids.length,
      invalid: errors.length,
      fields,
      samples: wouldUpdate.slice(0, 10).map((patch) => {
        const current = existingById.get(patch.id)
        return {
          id: patch.id,
          handle: patch.handle ?? current?.handle,
          title: patch.title ?? current?.title,
          status: patch.status ?? current?.status,
        }
      }),
      missing_ids: missing_ids.slice(0, 20),
      errors: errors.slice(0, 20),
    }
  }

  verifyProductCreates(content: string): ProductCreateVerifySummary {
    const records = parseCsv(content)
    const errors: { row: number; message: string }[] = []
    const handles = new Set<string>()
    let missingSku = 0
    let missingHandle = 0
    let missingTitle = 0
    const samples: ProductCreateVerifySummary["samples"] = []

    for (let index = 0; index < records.length; index++) {
      const row = records[index]
      const rowNumber = index + 2
      const handle = pickRowValue(row, "Product Handle", "product handle")
      const title = pickRowValue(row, "Product Title", "product title")
      const sku = pickRowValue(row, "Variant SKU", "Variant Sku", "variant sku")
      const variantTitle = pickRowValue(row, "Variant Title", "variant title")

      if (!handle) {
        missingHandle++
        errors.push({
          row: rowNumber,
          message: "Product Handle is required for new products",
        })
      } else {
        handles.add(handle)
      }

      if (!title) {
        missingTitle++
        errors.push({
          row: rowNumber,
          message: "Product Title is required for new products",
        })
      }

      if (!sku) {
        missingSku++
        errors.push({
          row: rowNumber,
          message: "Variant SKU is required for each variant row",
        })
      } else if (samples.length < 10) {
        samples.push({
          handle,
          title,
          sku,
          variant_title: variantTitle || undefined,
        })
      }
    }

    return {
      rows: records.length,
      would_create_products: handles.size,
      would_create_variants: records.length,
      missing_sku: missingSku,
      missing_handle: missingHandle,
      missing_title: missingTitle,
      samples,
      errors: errors.slice(0, 20),
    }
  }

  /**
   * Same string coercion as verify (parseCsv), then Medusa CSVNormalizer.
   * Product/Variant Ids are cleared so rows always go through create.
   * Products with no option columns get Medusa's default Title/Default option.
   */
  private buildCreateProductsFromCsv(content: string) {
    const records = parseCsv(content)
    if (!records.length) {
      return []
    }

    const rows = records.map((row, index) => {
      const rowNumber = index + 1
      const next: Record<string, string> = { ...row }

      next["Product Id"] = ""
      next["Variant Id"] = ""

      const sku = pickRowValue(row, "Variant SKU", "Variant Sku", "variant sku")
      if (!sku) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Row ${rowNumber + 1}: Variant SKU is required when adding new products`
        )
      }

      next["Variant SKU"] = cellToString(sku)
      this.ensureDefaultVariantOption(next)

      return CSVNormalizer.preProcess(next, rowNumber)
    })

    const products = new CSVNormalizer(rows).proccess()

    return Object.keys(products.toCreate).map((handle) => {
      const product = this.ensureDefaultProductOptions(products.toCreate[handle])
      return productValidators.CreateProduct.parse(product)
    })
  }

  /** Fill Title/Default when CSV has no Variant Option columns. */
  private ensureDefaultVariantOption(row: Record<string, string>) {
    const hasOption = Object.keys(row).some((key) => {
      const lower = key.toLowerCase().trim()
      return (
        /^variant option \d+ name$/.test(lower) &&
        cellToString(row[key]) !== ""
      )
    })

    if (hasOption) {
      return
    }

    row["Variant Option 1 Name"] = "Title"
    row["Variant Option 1 Value"] =
      pickRowValue(row, "Variant Title", "variant title") || "Default"
  }

  private ensureDefaultProductOptions(product: Record<string, unknown>) {
    const options = product.options as Array<{ title?: string; values?: string[] }> | undefined
    if (options?.length) {
      return product
    }

    const variants = (product.variants as Array<Record<string, unknown>> | undefined) ?? []
    const defaultValue =
      cellToString(variants[0]?.title) || "Default"

    return {
      ...product,
      options: [{ title: "Title", values: [defaultValue] }],
      variants: variants.map((variant) => ({
        ...variant,
        options: {
          Title: cellToString(variant.title) || defaultValue,
          ...(typeof variant.options === "object" && variant.options
            ? (variant.options as Record<string, string>)
            : {}),
        },
      })),
    }
  }

  private buildProductUpdatePatches(
    content: string,
    fields: ProductUpdateField[]
  ) {
    const records = parseCsv(content)
    const fieldSet = new Set(fields)
    const productFields = [
      "status",
      "title",
      "subtitle",
      "description",
      "thumbnail",
      "handle",
    ] as const
    const variantFields = [
      "variant_sku",
      "variant_barcode",
      "variant_price",
      "variant_allow_backorder",
      "variant_manage_inventory",
    ] as const

    const touchProduct = productFields.some((field) => fieldSet.has(field))
    const touchVariants = variantFields.some((field) => fieldSet.has(field))

    type VariantPatch = {
      id: string
      sku?: string
      barcode?: string
      allow_backorder?: boolean
      manage_inventory?: boolean
      prices?: { amount: number; currency_code: string }[]
    }

    type ProductPatch = {
      id: string
      status?: string
      title?: string
      subtitle?: string | null
      description?: string | null
      thumbnail?: string | null
      handle?: string
      variants?: VariantPatch[]
      row: number
    }

    const byProductId = new Map<string, ProductPatch>()
    const errors: { row: number; message: string }[] = []

    for (let index = 0; index < records.length; index++) {
      const row = records[index]
      const rowNumber = index + 2
      const productId = pickRowValue(row, "Product Id", "product id")

      if (!productId) {
        errors.push({
          row: rowNumber,
          message: "Update mode requires Product Id",
        })
        continue
      }

      let patch = byProductId.get(productId)
      if (!patch) {
        patch = { id: productId, row: rowNumber }
        byProductId.set(productId, patch)

        if (touchProduct) {
          if (fieldSet.has("status")) {
            const status = pickRowValue(row, "Product Status", "product status")
            if (status) {
              patch.status = status
            }
          }
          if (fieldSet.has("title")) {
            const title = pickRowValue(row, "Product Title", "product title")
            if (title) {
              patch.title = title
            }
          }
          if (fieldSet.has("subtitle")) {
            patch.subtitle = pickRowValue(row, "Product Subtitle", "product subtitle")
          }
          if (fieldSet.has("description")) {
            patch.description = pickRowValue(
              row,
              "Product Description",
              "product description"
            )
          }
          if (fieldSet.has("thumbnail")) {
            patch.thumbnail = pickRowValue(row, "Product Thumbnail", "product thumbnail")
          }
          if (fieldSet.has("handle")) {
            const handle = pickRowValue(row, "Product Handle", "product handle")
            if (handle) {
              patch.handle = handle
            }
          }
        }
      }

      if (!touchVariants) {
        continue
      }

      const variantId = pickRowValue(row, "Variant Id", "variant id")
      if (!variantId) {
        continue
      }

      const variant: VariantPatch = { id: variantId }

      if (fieldSet.has("variant_sku")) {
        variant.sku = pickRowValue(row, "Variant SKU", "Variant Sku", "variant sku")
      }
      if (fieldSet.has("variant_barcode")) {
        variant.barcode = pickRowValue(
          row,
          "Variant Barcode",
          "Variant Barcode",
          "variant barcode"
        )
      }
      if (fieldSet.has("variant_allow_backorder")) {
        const value = parseBoolean(
          pickRowValue(row, "Variant Allow Backorder", "variant allow backorder")
        )
        if (value !== undefined) {
          variant.allow_backorder = value
        }
      }
      if (fieldSet.has("variant_manage_inventory")) {
        const value = parseBoolean(
          pickRowValue(row, "Variant Manage Inventory", "variant manage inventory")
        )
        if (value !== undefined) {
          variant.manage_inventory = value
        }
      }
      if (fieldSet.has("variant_price")) {
        const amountRaw = pickRowValue(row, "Variant Price AUD", "Variant Price Aud")
        if (amountRaw !== "" && !Number.isNaN(Number(amountRaw))) {
          variant.prices = [
            {
              amount: Number(amountRaw),
              currency_code: "aud",
            },
          ]
        }
      }

      patch.variants = patch.variants ?? []
      patch.variants.push(variant)
    }

    return {
      patches: Array.from(byProductId.values()),
      errors,
      rows: records.length,
    }
  }

  private serializeVariantPatch(variant: {
    id: string
    sku?: string
    barcode?: string
    allow_backorder?: boolean
    manage_inventory?: boolean
    prices?: { amount: number; currency_code: string }[]
  }) {
    const payload: Record<string, unknown> = {
      id: cellToString(variant.id),
    }

    if (variant.sku !== undefined) {
      payload.sku = cellToString(variant.sku)
    }
    if (variant.barcode !== undefined) {
      payload.barcode = cellToString(variant.barcode)
    }
    if (variant.allow_backorder !== undefined) {
      payload.allow_backorder = variant.allow_backorder
    }
    if (variant.manage_inventory !== undefined) {
      payload.manage_inventory = variant.manage_inventory
    }
    if (variant.prices?.length) {
      payload.prices = variant.prices.map((price) => ({
        amount: Number(price.amount),
        currency_code: cellToString(price.currency_code),
      }))
    }

    return payload
  }

  private serializeProductPatch(patch: {
    id: string
    status?: string
    title?: string
    subtitle?: string | null
    description?: string | null
    thumbnail?: string | null
    handle?: string
  }) {
    const payload: Record<string, unknown> = {
      id: cellToString(patch.id),
    }

    if (patch.status !== undefined) {
      payload.status = cellToString(patch.status)
    }
    if (patch.title !== undefined) {
      payload.title = cellToString(patch.title)
    }
    if (patch.subtitle !== undefined) {
      payload.subtitle = cellToString(patch.subtitle)
    }
    if (patch.description !== undefined) {
      payload.description = cellToString(patch.description)
    }
    if (patch.thumbnail !== undefined) {
      payload.thumbnail = cellToString(patch.thumbnail)
    }
    if (patch.handle !== undefined) {
      payload.handle = cellToString(patch.handle)
    }

    return payload
  }

  private async updateProductsFromCsv(
    container: MedusaContainer,
    content: string,
    fields: ProductUpdateField[]
  ): Promise<ProductImportSummary> {
    const { patches, errors } = this.buildProductUpdatePatches(content, fields)

    const summary: ProductImportSummary = {
      created: 0,
      updated: 0,
      skipped: 0,
      failed: errors.length,
      errors: [...errors],
    }

    for (const patch of patches) {
      try {
        const productPayload = this.serializeProductPatch(patch)
        const hasProductChanges = Object.keys(productPayload).some(
          (key) => key !== "id"
        )

        const variantPayloads =
          patch.variants?.map((variant) => this.serializeVariantPatch(variant)) ??
          []

        if (!hasProductChanges && !variantPayloads.length) {
          summary.skipped++
          continue
        }

        if (hasProductChanges) {
          await updateProductsWorkflow(container).run({
            input: {
              products: [productPayload as never],
            },
          })
        }

        if (variantPayloads.length) {
          await updateProductVariantsWorkflow(container).run({
            input: {
              product_variants: variantPayloads as never,
            },
          })
        }

        summary.updated++
      } catch (error) {
        summary.failed++
        summary.errors.push({
          row: patch.row,
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    return summary
  }
}
