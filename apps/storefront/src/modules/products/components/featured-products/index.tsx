import FeaturedProductsSection from "@modules/home/components/featured-products"
import { getFeaturedProducts } from "@lib/data/featured-products"
import { getRegion } from "@lib/data/regions"
import { HttpTypes } from "@medusajs/types"

export default async function FeaturedProducts({
  countryCode,
  region: regionProp,
}: {
  countryCode: string
  region?: HttpTypes.StoreRegion | null
}) {
  try {
    const region = regionProp ?? (await getRegion(countryCode))
    const featured = await getFeaturedProducts({ countryCode })

    if (!region || !featured?.enabled || !featured.products.length) {
      return null
    }

    return (
      <div className="bg-white w-full">
        <div className="content-container py-10">
          <p className="text-2xl font-bold text-[#045a9c]">{featured.title}</p>
          {featured.subtitle ? (
            <p className="text-sm text-ui-fg-muted">{featured.subtitle}</p>
          ) : null}
        </div>

        <FeaturedProductsSection
          products={featured.products}
          region={region}
        />
      </div>
    )
  } catch (error) {
    console.error("Featured products section failed", error)
    return null
  }
}
