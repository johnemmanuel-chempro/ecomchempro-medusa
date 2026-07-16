import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import ImportExportModuleService from "../../../../../modules/import-export/service"
import { IMPORT_EXPORT_MODULE } from "../../../../../modules/import-export"
import { isImportExportEntity } from "../../../../../modules/import-export/templates"

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
  const template = service.getTemplate(entity)

  res.setHeader("Content-Type", "text/csv; charset=utf-8")
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${template.filename}"`
  )
  res.send(template.content)
}
