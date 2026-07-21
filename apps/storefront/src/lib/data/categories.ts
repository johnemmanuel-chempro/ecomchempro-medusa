import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { getCacheOptions } from "./cookies"

const bypassCatalogCache = () =>
  process.env.MEDUSA_STOREFRONT_NO_CACHE === "true"

export const listCategories = async (query?: Record<string, unknown>) => {
  const skipCache = bypassCatalogCache()
  const next = skipCache
    ? undefined
    : {
        ...(await getCacheOptions("categories")),
        revalidate: 3600,
      }

  const limit = query?.limit || 100

  return sdk.client
    .fetch<{ product_categories: HttpTypes.StoreProductCategory[] }>(
      "/store/product-categories",
      {
        query: {
          fields:
            "*category_children, *products, *parent_category, *parent_category.parent_category",
          limit,
          ...query,
        },
        next,
        cache: skipCache ? "no-store" : "force-cache",
      }
    )
    .then(({ product_categories }) => product_categories)
}

export const getCategoryByHandle = async (categoryHandle: string[]) => {
  const handle = `${categoryHandle.join("/")}`
  const skipCache = bypassCatalogCache()
  const next = skipCache
    ? undefined
    : {
        ...(await getCacheOptions("categories")),
        revalidate: 3600,
      }

  return sdk.client
    .fetch<HttpTypes.StoreProductCategoryListResponse>(
      `/store/product-categories`,
      {
        query: {
          fields: "*category_children, *products",
          handle,
        },
        next,
        cache: skipCache ? "no-store" : "force-cache",
      }
    )
    .then(({ product_categories }) => product_categories[0])
}
