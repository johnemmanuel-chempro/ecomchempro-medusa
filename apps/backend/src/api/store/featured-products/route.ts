import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { FEATURED_PRODUCTS_MODULE } from "../../../modules/featured-products"
import FeaturedProductsModuleService from "../../../modules/featured-products/service"

function getService(req: MedusaRequest): FeaturedProductsModuleService {
  return req.scope.resolve(FEATURED_PRODUCTS_MODULE)
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const regionId =
    typeof req.query.region_id === "string" ? req.query.region_id : undefined

  if (!regionId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "region_id query parameter is required"
    )
  }

  const service = getService(req)
  const payload = await service.getStorePayload(req.scope, regionId)

  res.json(payload)
}
