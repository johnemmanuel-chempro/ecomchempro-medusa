"use server"

import { sdk } from "@lib/config"
import { getRegion } from "@lib/data/regions"
import { listProducts } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"

export type FeaturedProductsPayload = {
  enabled: boolean
  title: string
  subtitle: string | null
  max_items: number
  products: HttpTypes.StoreProduct[]
}

async function hydrateProductsWithStorePricing(
  products: HttpTypes.StoreProduct[],
  countryCode: string
) {
  if (!products.length) {
    return products
  }

  const productIds = products
    .map((product) => product.id)
    .filter((id): id is string => Boolean(id))

  if (!productIds.length) {
    return products
  }

  const { response } = await listProducts({
    countryCode,
    queryParams: {
      id: productIds,
      limit: productIds.length,
    },
  })

  const pricedById = new Map(
    response.products.map((product) => [product.id, product])
  )

  return products.map(
    (product) => pricedById.get(product.id!) ?? product
  )
}

export async function getFeaturedProducts({
  countryCode,
}: {
  countryCode: string
}): Promise<FeaturedProductsPayload | null> {
  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  try {
    const payload = await sdk.client.fetch<FeaturedProductsPayload>(
      "/store/featured-products",
      {
        method: "GET",
        query: {
          region_id: region.id,
        },
        cache: "no-store",
      }
    )

    if (!payload?.products?.length) {
      return payload
    }

    return {
      ...payload,
      products: await hydrateProductsWithStorePricing(
        payload.products,
        countryCode
      ),
    }
  } catch (error) {
    console.error("Failed to load featured products", error)
    return null
  }
}
