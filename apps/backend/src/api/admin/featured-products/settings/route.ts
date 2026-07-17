import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { FEATURED_PRODUCTS_MODULE } from "../../../../modules/featured-products"
import FeaturedProductsModuleService from "../../../../modules/featured-products/service"
import type { UpdateFeaturedSettingsInput } from "../../../../modules/featured-products/types"

function getService(req: MedusaRequest): FeaturedProductsModuleService {
  return req.scope.resolve(FEATURED_PRODUCTS_MODULE)
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = getService(req)
  const settings = await service.getSettings()

  res.json({ settings })
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as Record<string, unknown>
  const input: UpdateFeaturedSettingsInput = {}

  if (body.enabled !== undefined) {
    if (typeof body.enabled !== "boolean") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "enabled must be a boolean"
      )
    }
    input.enabled = body.enabled
  }

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "title must be a non-empty string"
      )
    }
    input.title = body.title.trim()
  }

  if (body.subtitle !== undefined) {
    if (body.subtitle !== null && typeof body.subtitle !== "string") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "subtitle must be a string or null"
      )
    }
    input.subtitle =
      typeof body.subtitle === "string" ? body.subtitle.trim() : null
  }

  if (body.max_items !== undefined) {
    if (typeof body.max_items !== "number") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "max_items must be a number"
      )
    }
    input.max_items = body.max_items
  }

  if (!Object.keys(input).length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "No valid fields provided to update"
    )
  }

  const service = getService(req)
  const settings = await service.updateSettings(input)

  res.json({ settings })
}
