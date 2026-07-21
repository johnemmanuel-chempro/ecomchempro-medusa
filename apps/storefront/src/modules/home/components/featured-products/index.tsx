import { HttpTypes } from "@medusajs/types"
import ProductPreview from "@modules/products/components/product-preview"

export default async function FeaturedProductsSection({
  products,
  region,
  countryCode,
}: {
  products: HttpTypes.StoreProduct[]
  region: HttpTypes.StoreRegion
  countryCode: string
}) {
  if (!products.length) {
    return null
  }

  return (
    <div className="content-container pb-10">
      <ul className="grid grid-cols-2 small:grid-cols-3 medium:grid-cols-5 gap-x-3 gap-y-5">
        {products.map((product) => (
          <li key={product.id}>
            <ProductPreview
              product={product}
              region={region}
              countryCode={countryCode}
              isFeatured
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
