import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { FEATURED_PRODUCTS_MODULE } from "../../../../modules/featured-products"
import FeaturedProductsModuleService from "../../../../modules/featured-products/service"

function getService(req: MedusaRequest): FeaturedProductsModuleService {
  return req.scope.resolve(FEATURED_PRODUCTS_MODULE)
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as Record<string, unknown>
  const ids = body.ids

  if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string")) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "ids must be an array of strings"
    )
  }

  const service = getService(req)
  const featured_products = await service.reorderFeaturedProducts(ids)

  res.json({ featured_products })
}
