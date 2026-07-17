import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  importProductsWorkflowId,
  waitConfirmationProductImportStepId,
} from "@medusajs/medusa/core-flows"
import ImportExportModuleService from "../../../../modules/import-export/service"
import { IMPORT_EXPORT_MODULE } from "../../../../modules/import-export"
import { isImportExportEntity } from "../../../../modules/import-export/templates"
import {
  isCategoryImportMode,
  isCategoryParentReferenceType,
  isProductImportMode,
  isProductUpdateField,
  type ProductUpdateField,
} from "../../../../modules/import-export/types"

function parseDryRun(body: Record<string, unknown>): boolean {
  const dryRunRaw = body.dry_run ?? body.verify
  return (
    dryRunRaw === true ||
    dryRunRaw === "true" ||
    dryRunRaw === "1" ||
    dryRunRaw === "on"
  )
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { entity } = req.params

  if (!entity || !isImportExportEntity(entity)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Entity must be products or categories"
    )
  }

  const service: ImportExportModuleService = req.scope.resolve(
    IMPORT_EXPORT_MODULE
  )
  const csv = await service.exportEntity(req.scope, entity)
  const filename =
    entity === "products"
      ? "chempro-products-export.csv"
      : "chempro-categories-export.csv"

  res.setHeader("Content-Type", "text/csv; charset=utf-8")
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
  res.send(csv)
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { entity } = req.params
  const file = req.file

  if (!entity || !isImportExportEntity(entity)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Entity must be products or categories"
    )
  }

  if (!file) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "No file was uploaded for importing"
    )
  }

  const service: ImportExportModuleService = req.scope.resolve(
    IMPORT_EXPORT_MODULE
  )
  const fileContent = file.buffer.toString("utf-8")
  const body = (req.body ?? {}) as Record<string, unknown>
  const dry_run = parseDryRun(body)

  if (entity === "categories") {
    const modeRaw = body.mode
    if (!isCategoryImportMode(modeRaw)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Category import mode must be create or update"
      )
    }

    const parentReferenceRaw = body.parent_reference_type
    const parent_reference_type = isCategoryParentReferenceType(
      parentReferenceRaw
    )
      ? parentReferenceRaw
      : modeRaw === "create"
        ? "seo_url"
        : "category_id"

    const outcome = await service.importCategories(req.scope, fileContent, {
      mode: modeRaw,
      parent_reference_type,
      dry_run,
    })

    if (outcome.kind === "verify") {
      res.status(200).json({
        entity,
        mode: modeRaw,
        parent_reference_type,
        verified: true,
        summary: outcome.summary,
      })
      return
    }

    res.status(200).json({
      entity,
      mode: modeRaw,
      parent_reference_type,
      summary: outcome.summary,
    })
    return
  }

  const modeRaw = body.mode
  const mode = isProductImportMode(modeRaw) ? modeRaw : "update"

  const fieldsRaw = body.fields
  const fieldsList = Array.isArray(fieldsRaw)
    ? fieldsRaw
    : typeof fieldsRaw === "string"
      ? fieldsRaw.split(",").map((value) => value.trim()).filter(Boolean)
      : []
  const fields = fieldsList.filter(isProductUpdateField) as ProductUpdateField[]

  if (mode === "update" && fields.length === 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Select at least one field to update"
    )
  }

  const outcome = await service.importProducts(req.scope, fileContent, {
    mode,
    fields,
    dry_run,
  })

  if (outcome.kind === "preview") {
    res.status(202).json({
      entity,
      mode,
      transaction_id: outcome.transaction_id,
      workflow_id: importProductsWorkflowId,
      confirmation_step_id: waitConfirmationProductImportStepId,
      summary: outcome.summary,
    })
    return
  }

  if (outcome.kind === "verify") {
    res.status(200).json({
      entity,
      mode,
      fields,
      verified: true,
      summary: outcome.summary,
    })
    return
  }

  res.status(200).json({
    entity,
    mode,
    fields,
    summary: outcome.summary,
  })
}
