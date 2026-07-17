import { HttpTypes } from "@medusajs/types"
import ProductPreview from "@modules/products/components/product-preview"

export default async function FeaturedProductsSection({
  title,
  subtitle,
  products,
  region,
}: {
  title: string
  subtitle?: string | null
  products: HttpTypes.StoreProduct[]
  region: HttpTypes.StoreRegion
}) {
  if (!products.length) {
    return null
  }

  return (
    <div className="content-container py-10">
      <div className="mb-8">
        <p className="text-2xl font-bold text-[#045a9c]">{title}</p>
        {subtitle ? (
          <p className="text-sm text-ui-fg-muted">{subtitle}</p>
        ) : null}
      </div>

      <ul className="grid grid-cols-2 small:grid-cols-3 gap-x-6 gap-y-24 small:gap-y-36">
        {products.map((product) => (
          <li key={product.id}>
            <ProductPreview product={product} region={region} isFeatured />
          </li>
        ))}
      </ul>
    </div>
  )
}
