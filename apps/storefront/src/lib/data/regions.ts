"use server"

import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { getCacheOptions } from "./cookies"
import { bypassStorefrontCache } from "./cache"

export const listRegions = async () => {
  const skipCache = bypassStorefrontCache()
  const next = skipCache
    ? undefined
    : {
        ...(await getCacheOptions("regions")),
        revalidate: 3600,
      }

  return await sdk.client
    .fetch<{ regions: HttpTypes.StoreRegion[] }>(`/store/regions`, {
      method: "GET",
      next,
      cache: skipCache ? "no-store" : "force-cache",
    })
    .then(({ regions }) => regions)
}

export const retrieveRegion = async (id: string) => {
  const skipCache = bypassStorefrontCache()
  const next = skipCache
    ? undefined
    : {
        ...(await getCacheOptions(["regions", id].join("-"))),
        revalidate: 3600,
      }

  return await sdk.client
    .fetch<{ region: HttpTypes.StoreRegion }>(`/store/regions/${id}`, {
      method: "GET",
      next,
      cache: skipCache ? "no-store" : "force-cache",
    })
    .then(({ region }) => region)
}

const regionMap = new Map<string, HttpTypes.StoreRegion>()

export const getRegion = async (countryCode: string) => {
  const code = countryCode?.toLowerCase()

  // Don't reuse in-memory map across requests when bypassing cache (staging)
  if (!bypassStorefrontCache() && code && regionMap.has(code)) {
    return regionMap.get(code)
  }

  const regions = await listRegions()

  if (!regions) {
    return null
  }

  if (bypassStorefrontCache()) {
    regionMap.clear()
  }

  regions.forEach((region) => {
    region.countries?.forEach((c) => {
      const iso = (c?.iso_2 ?? "").toLowerCase()
      if (iso) {
        regionMap.set(iso, region)
      }
    })
  })

  return code ? (regionMap.get(code) ?? null) : (regionMap.get("us") ?? null)
}
