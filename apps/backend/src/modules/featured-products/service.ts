import {
  ContainerRegistrationKeys,
  MedusaError,
  MedusaService,
  QueryContext,
} from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import FeaturedProduct from "./models/featured-product"
import FeaturedSettings from "./models/featured-settings"
import {
  DEFAULT_SETTINGS,
  DEFAULT_SETTINGS_ID,
  type FeaturedProductDTO,
  type FeaturedSettingsDTO,
  type UpdateFeaturedProductInput,
  type UpdateFeaturedSettingsInput,
} from "./types"

type ProductSummary = {
  id: string
  title?: string | null
  handle?: string | null
  thumbnail?: string | null
  status?: string | null
}

class FeaturedProductsModuleService extends MedusaService({
  FeaturedProduct,
  FeaturedSettings,
}) {
  async getSettings(): Promise<FeaturedSettingsDTO> {
    // Prefer the known singleton id, otherwise reuse the oldest row.
    const byDefaultId = await this.listFeaturedSettings(
      { id: DEFAULT_SETTINGS_ID },
      { take: 1 }
    )

    if (byDefaultId.length) {
      return byDefaultId[0] as FeaturedSettingsDTO
    }

    const existing = await this.listFeaturedSettings(
      {},
      { take: 1, order: { created_at: "ASC" } }
    )

    if (existing.length) {
      return existing[0] as FeaturedSettingsDTO
    }

    const [created] = await this.createFeaturedSettings([
      {
        id: DEFAULT_SETTINGS_ID,
        ...DEFAULT_SETTINGS,
      },
    ])

    return created as FeaturedSettingsDTO
  }

  async updateSettings(
    input: UpdateFeaturedSettingsInput
  ): Promise<FeaturedSettingsDTO> {
    const current = await this.getSettings()

    if (input.max_items !== undefined) {
      if (!Number.isInteger(input.max_items) || input.max_items < 1) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "max_items must be a positive integer"
        )
      }
    }

    const [updated] = await this.updateFeaturedSettings([
      {
        id: current.id,
        ...input,
      },
    ])

    return updated as FeaturedSettingsDTO
  }

  async listFeaturedProductsOrdered(): Promise<FeaturedProductDTO[]> {
    const items = await this.listFeaturedProducts({}, {})

    return (items as FeaturedProductDTO[]).sort((a, b) => a.rank - b.rank)
  }

  async assertProductExists(
    container: MedusaContainer,
    productId: string
  ): Promise<ProductSummary> {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "product",
      fields: ["id", "title", "handle", "thumbnail", "status"],
      filters: { id: productId },
    })

    const product = data?.[0] as ProductSummary | undefined

    if (!product) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Product "${productId}" was not found`
      )
    }

    return product
  }

  async addFeaturedProduct(
    container: MedusaContainer,
    productId: string
  ): Promise<FeaturedProductDTO & { product?: ProductSummary }> {
    await this.assertProductExists(container, productId)

    const existing = await this.listFeaturedProducts(
      { product_id: productId },
      { take: 1 }
    )

    if (existing.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Product is already in the featured list"
      )
    }

    const items = await this.listFeaturedProductsOrdered()
    const nextRank =
      items.length > 0 ? Math.max(...items.map((item) => item.rank)) + 1 : 0

    const [created] = await this.createFeaturedProducts([
      {
        product_id: productId,
        rank: nextRank,
        is_active: true,
      },
    ])

    const product = await this.assertProductExists(container, productId)

    return {
      ...(created as FeaturedProductDTO),
      product,
    }
  }

  async updateFeaturedProduct(
    id: string,
    input: UpdateFeaturedProductInput
  ): Promise<FeaturedProductDTO> {
    const existing = await this.retrieveFeaturedProduct(id)
    const [updated] = await this.updateFeaturedProducts([
      {
        id: existing.id,
        ...input,
      },
    ])

    return updated as FeaturedProductDTO
  }

  async deleteFeaturedProduct(id: string): Promise<void> {
    await this.deleteFeaturedProducts(id)
    await this.normalizeRanks()
  }

  async reorderFeaturedProducts(ids: string[]): Promise<FeaturedProductDTO[]> {
    const items = await this.listFeaturedProductsOrdered()
    const itemMap = new Map(items.map((item) => [item.id, item]))

    for (const id of ids) {
      if (!itemMap.has(id)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Featured product "${id}" was not found`
        )
      }
    }

    if (ids.length !== items.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Reorder payload must include all featured products"
      )
    }

    const updates = ids.map((id, index) => ({
      id,
      rank: index,
    }))

    const updated = await this.updateFeaturedProducts(updates)

    return (updated as FeaturedProductDTO[]).sort((a, b) => a.rank - b.rank)
  }

  async normalizeRanks(): Promise<void> {
    const items = await this.listFeaturedProductsOrdered()

    if (!items.length) {
      return
    }

    await this.updateFeaturedProducts(
      items.map((item, index) => ({
        id: item.id,
        rank: index,
      }))
    )
  }

  async listFeaturedWithProducts(container: MedusaContainer): Promise<
    Array<FeaturedProductDTO & { product?: ProductSummary | null }>
  > {
    const items = await this.listFeaturedProductsOrdered()

    if (!items.length) {
      return []
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const productIds = items.map((item) => item.product_id)
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "title", "handle", "thumbnail", "status"],
      filters: { id: productIds },
    })

    const productMap = new Map(
      (products as ProductSummary[]).map((product) => [product.id, product])
    )

    return items.map((item) => ({
      ...item,
      product: productMap.get(item.product_id) ?? null,
    }))
  }

  async getStorePayload(
    container: MedusaContainer,
    regionId?: string
  ): Promise<{
    enabled: boolean
    title: string
    subtitle: string | null
    max_items: number
    products: Record<string, unknown>[]
  }> {
    const settings = await this.getSettings()

    if (!settings.enabled) {
      return {
        enabled: false,
        title: settings.title,
        subtitle: settings.subtitle,
        max_items: settings.max_items,
        products: [],
      }
    }

    const items = (await this.listFeaturedProductsOrdered())
      .filter((item) => item.is_active)
      .slice(0, settings.max_items)

    if (!items.length) {
      return {
        enabled: true,
        title: settings.title,
        subtitle: settings.subtitle,
        max_items: settings.max_items,
        products: [],
      }
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const productIds = items.map((item) => item.product_id)

    let currencyCode: string | undefined

    if (regionId) {
      const { data: regions } = await query.graph({
        entity: "region",
        fields: ["id", "currency_code"],
        filters: { id: regionId },
      })

      currencyCode = (regions?.[0] as { currency_code?: string } | undefined)
        ?.currency_code
    }

    const context =
      regionId && currencyCode
        ? {
            variants: {
              calculated_price: QueryContext({
                region_id: regionId,
                currency_code: currencyCode,
              }),
            },
          }
        : undefined

    const { data: products } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "handle",
        "subtitle",
        "description",
        "thumbnail",
        "status",
        "variants.id",
        "variants.title",
        "variants.sku",
        "variants.calculated_price.*",
        "variants.inventory_quantity",
        "images.*",
      ],
      filters: {
        id: productIds,
        status: "published",
      },
      context,
    })

    const productMap = new Map(
      (products as Record<string, unknown>[]).map((product) => [
        product.id as string,
        product,
      ])
    )

    const orderedProducts = productIds
      .map((id) => productMap.get(id))
      .filter(Boolean) as Record<string, unknown>[]

    return {
      enabled: true,
      title: settings.title,
      subtitle: settings.subtitle,
      max_items: settings.max_items,
      products: orderedProducts,
    }
  }
}

export default FeaturedProductsModuleService
