import { Module } from "@medusajs/framework/utils"
import ImportExportModuleService from "./service"

export const IMPORT_EXPORT_MODULE = "importExport"

export default Module(IMPORT_EXPORT_MODULE, {
  service: ImportExportModuleService,
})
