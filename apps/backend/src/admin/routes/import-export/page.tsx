// @ts-nocheck
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ArrowDownTray, ArrowUpTray } from "@medusajs/icons"
import {
  Badge,
  Button,
  Checkbox,
  Container,
  Heading,
  Label,
  RadioGroup,
  Tabs,
  Text,
  toast,
} from "@medusajs/ui"
import { useState } from "react"

type ImportExportEntity = "products" | "categories"
type ProductImportMode = "create" | "update"
type CategoryImportMode = "create" | "update"
type CategoryParentReferenceType = "seo_url" | "category_id"

type ProductUpdateField =
  | "status"
  | "title"
  | "subtitle"
  | "description"
  | "thumbnail"
  | "handle"
  | "variant_sku"
  | "variant_barcode"
  | "variant_price"
  | "variant_allow_backorder"
  | "variant_manage_inventory"

type ProductVerifySummary = {
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

type ProductCreateVerifySummary = {
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

type CategoryVerifySummary = {
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

type ImportVerifySummary =
  | ProductVerifySummary
  | ProductCreateVerifySummary
  | CategoryVerifySummary

function isProductCreateVerifySummary(
  summary: ImportVerifySummary
): summary is ProductCreateVerifySummary {
  return "would_create_products" in summary
}

function isCategoryVerifySummary(
  summary: ImportVerifySummary
): summary is CategoryVerifySummary {
  return "would_create" in summary && "parent_reference_type" in summary
}

const PRODUCT_FIELD_OPTIONS: { id: ProductUpdateField; label: string }[] = [
  { id: "status", label: "Product status" },
  { id: "title", label: "Product title" },
  { id: "subtitle", label: "Product subtitle" },
  { id: "description", label: "Product description" },
  { id: "thumbnail", label: "Product thumbnail" },
  { id: "handle", label: "SEO URL (handle)" },
  { id: "variant_sku", label: "Variant SKU" },
  { id: "variant_barcode", label: "Variant barcode" },
  { id: "variant_price", label: "Variant price (AUD)" },
  { id: "variant_allow_backorder", label: "Variant allow backorder" },
  { id: "variant_manage_inventory", label: "Variant manage inventory" },
]

const DEFAULT_UPDATE_FIELDS: ProductUpdateField[] = ["status"]

function adminApiPath(path: string) {
  return `/${path.replace(/^\/+/, "")}`
}

async function downloadFile(path: string, fallbackName: string) {
  const response = await fetch(adminApiPath(path), {
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`)
  }

  const blob = await response.blob()
  const disposition = response.headers.get("Content-Disposition") ?? ""
  const match = disposition.match(/filename="(.+?)"/)
  const filename = match?.[1] ?? fallbackName
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

const EntityPanel = ({
  entity,
  title,
  description,
}: {
  entity: ImportExportEntity
  title: string
  description: string
}) => {
  const [file, setFile] = useState(null)
  const [isImporting, setIsImporting] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [preview, setPreview] = useState(null)
  const [verifySummary, setVerifySummary] = useState(null)
  const [importMode, setImportMode] = useState("update")
  const [updateFields, setUpdateFields] = useState(DEFAULT_UPDATE_FIELDS)
  const [parentReferenceType, setParentReferenceType] = useState("category_id")

  const resetImportState = () => {
    setPreview(null)
    setVerifySummary(null)
  }

  const toggleField = (fieldId) => {
    setUpdateFields((current) =>
      current.includes(fieldId)
        ? current.filter((field) => field !== fieldId)
        : [...current, fieldId]
    )
    setVerifySummary(null)
  }

  const setCategoryMode = (value) => {
    setImportMode(value)
    setParentReferenceType(value === "create" ? "seo_url" : "category_id")
    resetImportState()
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await downloadFile(
        `admin/import-export/${entity}`,
        `chempro-${entity}-export.csv`
      )
      toast.success(`${title} export downloaded`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed")
    } finally {
      setIsExporting(false)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      await downloadFile(
        `admin/import-export/templates/${entity}`,
        `chempro-${entity}-template.csv`
      )
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Template download failed"
      )
    }
  }

  const buildProductFormData = (dryRun = false) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("mode", importMode)
    if (importMode === "update") {
      formData.append("fields", updateFields.join(","))
    }
    if (dryRun) {
      formData.append("dry_run", "true")
    }
    return formData
  }

  const buildCategoryFormData = (dryRun = false) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("mode", importMode)
    formData.append("parent_reference_type", parentReferenceType)
    if (dryRun) {
      formData.append("dry_run", "true")
    }
    return formData
  }

  const handleVerify = async () => {
    if (!file || (entity !== "products" && entity !== "categories")) {
      return
    }

    if (
      entity === "products" &&
      importMode === "update" &&
      !updateFields.length
    ) {
      toast.error("Select at least one field to update")
      return
    }

    setIsVerifying(true)

    try {
      const body =
        entity === "products"
          ? buildProductFormData(true)
          : buildCategoryFormData(true)

      const response = await fetch(adminApiPath(`admin/import-export/${entity}`), {
        method: "POST",
        credentials: "include",
        body,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || `Verify failed (${response.status})`)
      }

      setVerifySummary(data.summary)
      setPreview(null)

      if (isCategoryVerifySummary(data.summary)) {
        const ready =
          data.summary.would_create + data.summary.would_update
        if (data.summary.errors?.length) {
          toast.error(
            `${data.summary.errors.length} validation issue(s) found`
          )
        } else {
          toast.success(
            importMode === "create"
              ? `${ready} categor${ready === 1 ? "y" : "ies"} ready to create`
              : `${ready} categor${ready === 1 ? "y" : "ies"} ready to update`
          )
        }
      } else if (isProductCreateVerifySummary(data.summary)) {
        if (data.summary.missing_sku > 0) {
          toast.error(
            `${data.summary.missing_sku} row(s) missing Variant SKU (required for new products)`
          )
        } else {
          toast.success(
            `${data.summary.would_create_products} product(s), ${data.summary.would_create_variants} variant row(s) ready to import`
          )
        }
      } else {
        toast.success(
          `${data.summary.would_update} product(s) ready to update` +
            (data.summary.not_found
              ? `, ${data.summary.not_found} not found`
              : "")
        )
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verify failed")
    } finally {
      setIsVerifying(false)
    }
  }

  const handleImport = async () => {
    if (!file) {
      return
    }

    if (entity === "products") {
      if (importMode === "update" && !updateFields.length) {
        toast.error("Select at least one field to update")
        return
      }
      if (!verifySummary) {
        toast.error("Verify the file first before importing")
        return
      }
      if (
        importMode === "create" &&
        isProductCreateVerifySummary(verifySummary) &&
        verifySummary.missing_sku > 0
      ) {
        toast.error("Fix missing Variant SKU rows before importing")
        return
      }
    }

    if (entity === "categories") {
      if (!verifySummary || !isCategoryVerifySummary(verifySummary)) {
        toast.error("Verify the file first before importing")
        return
      }
      if (verifySummary.errors?.length) {
        toast.error("Fix validation errors before importing")
        return
      }
      if (
        verifySummary.would_create + verifySummary.would_update === 0
      ) {
        toast.error("Nothing to import after verification")
        return
      }
    }

    setIsImporting(true)

    try {
      const formData =
        entity === "products"
          ? buildProductFormData(false)
          : buildCategoryFormData(false)

      const response = await fetch(adminApiPath(`admin/import-export/${entity}`), {
        method: "POST",
        credentials: "include",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || `Import failed (${response.status})`)
      }

      setPreview(data)
      toast.success(`${title} import completed`)
      setFile(null)
      setVerifySummary(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed")
    } finally {
      setIsImporting(false)
    }
  }

  const categorySummary =
    entity === "categories" && !preview?.verified ? preview?.summary : null

  const productSummary =
    entity === "products" && !preview?.verified ? preview?.summary : null

  const requiresVerify = entity === "products" || entity === "categories"
  const categoryHasErrors =
    verifySummary &&
    isCategoryVerifySummary(verifySummary) &&
    verifySummary.errors?.length > 0

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-y-2 px-6 py-4">
        <Heading level="h2">{title}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {description}
        </Text>
      </div>

      <div className="flex flex-col gap-y-6 px-6 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="small"
            variant="secondary"
            onClick={handleExport}
            isLoading={isExporting}
          >
            <ArrowDownTray />
            Export CSV
          </Button>
          <Button size="small" variant="secondary" onClick={handleDownloadTemplate}>
            Download template
          </Button>
        </div>

        <div className="flex flex-col gap-y-3">
          <Heading level="h3">Import CSV</Heading>

          {entity === "products" && (
            <div className="flex flex-col gap-y-4 rounded-lg border p-4">
              <div className="flex flex-col gap-y-2">
                <Text size="small" weight="plus">
                  Import mode
                </Text>
                <RadioGroup
                  value={importMode}
                  onValueChange={(value) => {
                    setImportMode(value)
                    resetImportState()
                  }}
                >
                  <div className="flex items-center gap-x-2">
                    <RadioGroup.Item value="update" id="mode-update" />
                    <Label htmlFor="mode-update" weight="plus">
                      Update existing products
                    </Label>
                  </div>
                  <Text size="small" className="text-ui-fg-subtle pl-6">
                    Requires Product Id. Verify first, then import selected
                    fields only. Variant options are never overwritten.
                  </Text>
                  <div className="flex items-center gap-x-2">
                    <RadioGroup.Item value="create" id="mode-create" />
                    <Label htmlFor="mode-create" weight="plus">
                      Add new products
                    </Label>
                  </div>
                  <Text size="small" className="text-ui-fg-subtle pl-6">
                    Creates products from the CSV (ids are ignored). Each variant
                    row must include a Variant SKU. Verify first, then import.
                  </Text>
                </RadioGroup>
              </div>

              {importMode === "update" && (
                <div className="flex flex-col gap-y-2">
                  <Text size="small" weight="plus">
                    Fields to update
                  </Text>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {PRODUCT_FIELD_OPTIONS.map((field) => (
                      <div key={field.id} className="flex items-center gap-x-2">
                        <Checkbox
                          id={`field-${field.id}`}
                          checked={updateFields.includes(field.id)}
                          onCheckedChange={() => toggleField(field.id)}
                        />
                        <Label htmlFor={`field-${field.id}`}>{field.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {entity === "categories" && (
            <div className="flex flex-col gap-y-4 rounded-lg border p-4">
              <div className="flex flex-col gap-y-2">
                <Text size="small" weight="plus">
                  Import mode
                </Text>
                <RadioGroup
                  value={importMode}
                  onValueChange={setCategoryMode}
                >
                  <div className="flex items-center gap-x-2">
                    <RadioGroup.Item value="update" id="category-mode-update" />
                    <Label htmlFor="category-mode-update" weight="plus">
                      Update existing categories
                    </Label>
                  </div>
                  <Text size="small" className="text-ui-fg-subtle pl-6">
                    Requires Category Id on every row. Verify first, then import.
                  </Text>
                  <div className="flex items-center gap-x-2">
                    <RadioGroup.Item value="create" id="category-mode-create" />
                    <Label htmlFor="category-mode-create" weight="plus">
                      Add new categories
                    </Label>
                  </div>
                  <Text size="small" className="text-ui-fg-subtle pl-6">
                    Creates categories from the CSV (Category Id is ignored).
                    Existing SEO URLs are rejected. Verify first, then import.
                  </Text>
                </RadioGroup>
              </div>

              <div className="flex flex-col gap-y-2">
                <Text size="small" weight="plus">
                  Parent reference
                </Text>
                <RadioGroup
                  value={parentReferenceType}
                  onValueChange={(value) => {
                    setParentReferenceType(value)
                    resetImportState()
                  }}
                >
                  <div className="flex items-center gap-x-2">
                    <RadioGroup.Item
                      value="seo_url"
                      id="parent-ref-seo-url"
                    />
                    <Label htmlFor="parent-ref-seo-url" weight="plus">
                      Parent SEO URL
                    </Label>
                  </div>
                  <Text size="small" className="text-ui-fg-subtle pl-6">
                    Best for create imports. Can reference a parent created in
                    the same file.
                  </Text>
                  <div className="flex items-center gap-x-2">
                    <RadioGroup.Item
                      value="category_id"
                      id="parent-ref-category-id"
                    />
                    <Label htmlFor="parent-ref-category-id" weight="plus">
                      Parent Category Id
                    </Label>
                  </div>
                  <Text size="small" className="text-ui-fg-subtle pl-6">
                    Best for updates from an export. Uses a stable parent id.
                  </Text>
                </RadioGroup>
              </div>
            </div>
          )}

          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              resetImportState()
              setFile(event.target.files?.[0] ?? null)
            }}
          />
          {file && (
            <Text size="small" className="text-ui-fg-subtle">
              Selected file: {file.name}
            </Text>
          )}

          <div className="flex flex-wrap gap-2">
            {requiresVerify && (
              <Button
                size="small"
                variant="secondary"
                onClick={handleVerify}
                disabled={!file}
                isLoading={isVerifying}
              >
                Verify
              </Button>
            )}

            <Button
              size="small"
              onClick={handleImport}
              disabled={
                !file ||
                (requiresVerify && !verifySummary) ||
                Boolean(categoryHasErrors)
              }
              isLoading={isImporting}
            >
              <ArrowUpTray />
              Import
            </Button>
          </div>
        </div>

        {verifySummary && (
          <div className="rounded-lg border p-4">
            <Heading level="h3" className="mb-2">
              Verify result
            </Heading>
            {isCategoryVerifySummary(verifySummary) ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {verifySummary.mode === "create" ? (
                    <Badge color="green">
                      Would create: {verifySummary.would_create}
                    </Badge>
                  ) : (
                    <Badge color="blue">
                      Would update: {verifySummary.would_update}
                    </Badge>
                  )}
                  <Badge color="grey">Rows: {verifySummary.rows}</Badge>
                  {verifySummary.not_found > 0 && (
                    <Badge color="orange">
                      Not found: {verifySummary.not_found}
                    </Badge>
                  )}
                  {verifySummary.conflicts > 0 && (
                    <Badge color="orange">
                      Conflicts: {verifySummary.conflicts}
                    </Badge>
                  )}
                  {verifySummary.missing_parent > 0 && (
                    <Badge color="orange">
                      Missing parent: {verifySummary.missing_parent}
                    </Badge>
                  )}
                  {verifySummary.invalid > 0 && (
                    <Badge color="red">
                      Invalid rows: {verifySummary.invalid}
                    </Badge>
                  )}
                </div>
                <Text size="small" className="text-ui-fg-subtle mt-2">
                  Parent method:{" "}
                  {verifySummary.parent_reference_type === "seo_url"
                    ? "Parent SEO URL"
                    : "Parent Category Id"}
                </Text>
              </>
            ) : isProductCreateVerifySummary(verifySummary) ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge color="green">
                    Products to create: {verifySummary.would_create_products}
                  </Badge>
                  <Badge color="blue">
                    Variant rows: {verifySummary.would_create_variants}
                  </Badge>
                  {verifySummary.missing_sku > 0 && (
                    <Badge color="red">
                      Missing SKU: {verifySummary.missing_sku}
                    </Badge>
                  )}
                  {verifySummary.missing_handle > 0 && (
                    <Badge color="orange">
                      Missing handle: {verifySummary.missing_handle}
                    </Badge>
                  )}
                </div>
                <Text size="small" className="text-ui-fg-subtle mt-2">
                  Every variant row needs Product Handle, Product Title, and
                  Variant SKU.
                </Text>
              </>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Badge color="blue">
                  Would update: {verifySummary.would_update}
                </Badge>
                <Badge color="grey">
                  Unique products: {verifySummary.unique_products}
                </Badge>
                <Badge color="grey">Rows: {verifySummary.rows}</Badge>
                {verifySummary.not_found > 0 && (
                  <Badge color="orange">
                    Not found: {verifySummary.not_found}
                  </Badge>
                )}
                {verifySummary.invalid > 0 && (
                  <Badge color="red">
                    Invalid rows: {verifySummary.invalid}
                  </Badge>
                )}
              </div>
            )}

            {verifySummary.samples?.length > 0 && (
              <div className="mt-3 flex flex-col gap-y-1">
                <Text size="small" weight="plus">
                  Sample rows
                </Text>
                {verifySummary.samples.map((sample, index) => (
                  <Text
                    key={
                      isCategoryVerifySummary(verifySummary)
                        ? `${sample.handle}-${sample.action}-${index}`
                        : isProductCreateVerifySummary(verifySummary)
                          ? `${sample.handle}-${sample.sku}-${index}`
                          : sample.id
                    }
                    size="small"
                    className="text-ui-fg-subtle"
                  >
                    {isCategoryVerifySummary(verifySummary)
                      ? `${sample.name} (/ ${sample.handle}) · ${sample.action}`
                      : isProductCreateVerifySummary(verifySummary)
                        ? `${sample.title || sample.handle} · SKU ${sample.sku}`
                        : `${sample.title || sample.id}${
                            sample.handle ? ` (/ ${sample.handle})` : ""
                          }${sample.status ? ` · ${sample.status}` : ""}`}
                  </Text>
                ))}
              </div>
            )}

            {verifySummary.errors?.length > 0 && (
              <div className="mt-3 flex flex-col gap-y-1">
                {verifySummary.errors.map((error) => (
                  <Text key={`${error.row}-${error.message}`} size="small">
                    Row {error.row}: {error.message}
                  </Text>
                ))}
              </div>
            )}
          </div>
        )}

        {categorySummary && (
          <div className="rounded-lg border p-4">
            <Heading level="h3" className="mb-2">
              Import summary
            </Heading>
            <div className="flex flex-wrap gap-2">
              <Badge color="green">Created: {categorySummary.created}</Badge>
              <Badge color="blue">Updated: {categorySummary.updated}</Badge>
              {categorySummary.failed > 0 && (
                <Badge color="red">Failed: {categorySummary.failed}</Badge>
              )}
            </div>
            {categorySummary.errors.length > 0 && (
              <div className="mt-3 flex flex-col gap-y-1">
                {categorySummary.errors.map((error) => (
                  <Text key={`${error.row}-${error.message}`} size="small">
                    Row {error.row}: {error.message}
                  </Text>
                ))}
              </div>
            )}
          </div>
        )}

        {entity === "products" && productSummary && (
          <div className="rounded-lg border p-4">
            <Heading level="h3" className="mb-2">
              Import result
            </Heading>
            <pre className="overflow-auto text-xs">
              {JSON.stringify(productSummary, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </Container>
  )
}

const ImportExportPage = () => {
  return (
    <div className="flex flex-col gap-y-4">
      <Container className="p-0">
        <div className="px-6 py-4">
          <Heading level="h1">Import / Export</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            ChemPro bulk import and export for catalog data.
          </Text>
        </div>
      </Container>

      <Tabs defaultValue="products">
        <Tabs.List>
          <Tabs.Trigger value="products">Products</Tabs.Trigger>
          <Tabs.Trigger value="categories">Categories</Tabs.Trigger>
          <Tabs.Trigger value="manufacturers" disabled>
            Manufacturers
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="products" className="mt-4">
          <EntityPanel
            entity="products"
            title="Products"
            description="Choose add or update, pick fields, verify matches, then import."
          />
        </Tabs.Content>

        <Tabs.Content value="categories" className="mt-4">
          <EntityPanel
            entity="categories"
            title="Categories"
            description="Choose create or update, select parent SEO URL or parent category id, verify the file, then import."
          />
        </Tabs.Content>

        <Tabs.Content value="manufacturers" className="mt-4">
          <Container className="px-6 py-4">
            <Text className="text-ui-fg-subtle">
              Manufacturer import/export will be added once manufacturers are
              available in ChemPro.
            </Text>
          </Container>
        </Tabs.Content>
      </Tabs>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Import / Export",
})

export default ImportExportPage
