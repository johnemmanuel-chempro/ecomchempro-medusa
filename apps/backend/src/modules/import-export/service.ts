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
  CategoryImportSummary,
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
  "Category Handle",
  "Category Name",
  "Category Description",
  "Parent Handle",
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

    const rows = (categories as CategoryRecord[]).map((category) => ({
      "Category Id": category.id,
      "Category Handle": category.handle,
      "Category Name": category.name,
      "Category Description": category.description ?? "",
      "Parent Handle": (category as { parent_category?: { handle?: string } })
        .parent_category?.handle ?? "",
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
        record["Category Name"] ||
        record.name ||
        record.Name ||
        ""

      if (!name) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Each category row must include a name"
        )
      }

      const handle =
        record["Category Handle"] ||
        record.handle ||
        slugify(name)

      return {
        id: record["Category Id"] || record.id || undefined,
        handle,
        name,
        description:
          record["Category Description"] || record.description || undefined,
        parent_handle:
          record["Parent Handle"] || record.parent_handle || undefined,
        is_active: parseBoolean(
          record["Is Active"] || record.is_active
        ),
        is_internal: parseBoolean(
          record["Is Internal"] || record.is_internal
        ),
        rank: record.Rank || record.rank ? Number(record.Rank || record.rank) : undefined,
      }
    })
  }

  async importCategories(
    container: MedusaContainer,
    content: string
  ): Promise<CategoryImportSummary> {
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

    const summary: CategoryImportSummary = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: [],
    }

    const pendingParentLinks: {
      categoryId: string
      parentHandle: string
      row: number
    }[] = []

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index]
      const rowNumber = index + 2

      try {
        const existing =
          (row.id && categoriesById.get(row.id)) ||
          (row.handle && categoriesByHandle.get(row.handle)) ||
          null

        const payload = {
          name: row.name,
          handle: row.handle,
          description: row.description,
          is_active: row.is_active ?? true,
          is_internal: row.is_internal ?? false,
          rank: row.rank ?? 0,
        }

        if (existing) {
          await updateProductCategoriesWorkflow(container).run({
            input: {
              selector: { id: existing.id },
              update: payload,
            },
          })
          summary.updated++
        } else {
          const { result } = await createProductCategoriesWorkflow(container).run({
            input: {
              product_categories: [payload],
            },
          })

          const created = result[0]

          if (created) {
            categoriesByHandle.set(created.handle, created as CategoryRecord)
            categoriesById.set(created.id, created as CategoryRecord)
          }

          summary.created++
        }

        const categoryId =
          existing?.id ||
          categoriesByHandle.get(row.handle!)?.id

        if (row.parent_handle && categoryId) {
          pendingParentLinks.push({
            categoryId,
            parentHandle: row.parent_handle,
            row: rowNumber,
          })
        }
      } catch (error) {
        summary.failed++
        summary.errors.push({
          row: rowNumber,
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    for (const link of pendingParentLinks) {
      try {
        const parent = categoriesByHandle.get(link.parentHandle)

        if (!parent) {
          throw new Error(`Parent category "${link.parentHandle}" was not found`)
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

    return summary
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
