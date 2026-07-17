import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { FEATURED_PRODUCTS_MODULE } from "../../../../modules/featured-products"
import FeaturedProductsModuleService from "../../../../modules/featured-products/service"
import type { UpdateFeaturedProductInput } from "../../../../modules/featured-products/types"

function getService(req: MedusaRequest): FeaturedProductsModuleService {
  return req.scope.resolve(FEATURED_PRODUCTS_MODULE)
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const body = (req.body ?? {}) as Record<string, unknown>

  if (!id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Featured product id is required"
    )
  }

  const input: UpdateFeaturedProductInput = {}

  if (body.is_active !== undefined) {
    if (typeof body.is_active !== "boolean") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "is_active must be a boolean"
      )
    }
    input.is_active = body.is_active
  }

  if (body.rank !== undefined) {
    if (typeof body.rank !== "number" || !Number.isInteger(body.rank)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "rank must be an integer"
      )
    }
    input.rank = body.rank
  }

  if (!Object.keys(input).length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "No valid fields provided to update"
    )
  }

  const service = getService(req)
  const featured_product = await service.updateFeaturedProduct(id, input)

  res.json({ featured_product })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params

  if (!id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Featured product id is required"
    )
  }

  const service = getService(req)
  await service.deleteFeaturedProduct(id)

  res.status(200).json({ id, deleted: true })
}
