"use server"

import { sdk } from "@lib/config"
import { getRegion } from "@lib/data/regions"
import { HttpTypes } from "@medusajs/types"

export type FeaturedProductsPayload = {
  enabled: boolean
  title: string
  subtitle: string | null
  max_items: number
  products: HttpTypes.StoreProduct[]
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
    return await sdk.client.fetch<FeaturedProductsPayload>(
      "/store/featured-products",
      {
        method: "GET",
        query: {
          region_id: region.id,
        },
        // Admin settings change often — avoid serving a stale homepage payload.
        cache: "no-store",
      }
    )
  } catch (error) {
    console.error("Failed to load featured products", error)
    return null
  }
}
