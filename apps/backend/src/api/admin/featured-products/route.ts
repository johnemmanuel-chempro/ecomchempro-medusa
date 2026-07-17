import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { FEATURED_PRODUCTS_MODULE } from "../../../modules/featured-products"
import FeaturedProductsModuleService from "../../../modules/featured-products/service"

function getService(req: MedusaRequest): FeaturedProductsModuleService {
  return req.scope.resolve(FEATURED_PRODUCTS_MODULE)
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = getService(req)
  const [settings, featured_products] = await Promise.all([
    service.getSettings(),
    service.listFeaturedWithProducts(req.scope),
  ])

  res.json({
    settings,
    featured_products,
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as Record<string, unknown>
  const productId = body.product_id

  if (typeof productId !== "string" || !productId.trim()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "product_id is required"
    )
  }

  const service = getService(req)
  const featured_product = await service.addFeaturedProduct(
    req.scope,
    productId.trim()
  )

  res.status(201).json({ featured_product })
}
