"use server"

import { sdk } from "@lib/config"
import { getRegion } from "@lib/data/regions"
import { getCacheOptions } from "@lib/data/cookies"
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

  const next = {
    ...(await getCacheOptions("featured-products")),
  }

  return sdk.client
    .fetch<FeaturedProductsPayload>("/store/featured-products", {
      method: "GET",
      query: {
        region_id: region.id,
      },
      next,
      cache: "force-cache",
    })
    .catch(() => null)
}
