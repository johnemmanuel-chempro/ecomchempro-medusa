import { Text } from "@modules/common/components/ui"
import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../thumbnail"
import PriceBadge from "./price-badge"
import MetaTags from "./meta-tags"
import WishlistButton from "./wishlist-button"
import AddToCartButton from "./add-to-cart-button"

type VariantWithPrice = HttpTypes.StoreProductVariant & {
  calculated_price?: {
    calculated_amount: number
  }
}

function getCheapestVariantId(product: HttpTypes.StoreProduct) {
  const variants = (product.variants as VariantWithPrice[] | undefined) ?? []
  if (!variants.length) return null

  const priced = variants
    .filter((v) => v.id && v.calculated_price?.calculated_amount != null)
    .sort(
      (a, b) =>
        (a.calculated_price?.calculated_amount ?? 0) -
        (b.calculated_price?.calculated_amount ?? 0)
    )

  return priced[0]?.id ?? variants[0]?.id ?? null
}

export default async function ProductPreview({
  product,
  isFeatured,
  region: _region,
  countryCode,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  region: HttpTypes.StoreRegion
  countryCode: string
}) {
  const { cheapestPrice } = getProductPrice({ product })
  const variantId = getCheapestVariantId(product)

  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white"
      data-testid="product-wrapper"
    >
      <div className="relative bg-white">
        <LocalizedClientLink href={`/products/${product.handle}`} className="block group">
          <Thumbnail
            thumbnail={product.thumbnail}
            images={product.images}
            size="square"
            isFeatured={isFeatured}
            className="rounded-none border-0 shadow-none bg-white p-3 group-hover:shadow-none aspect-square"
          />
        </LocalizedClientLink>
        <WishlistButton productId={product.id!} />
      </div>

      <div className="flex flex-1 flex-col gap-2 bg-neutral-100 px-3 pb-3 pt-3">
        <div className="flex items-start justify-between gap-2">
          <LocalizedClientLink
            href={`/products/${product.handle}`}
            className="min-w-0 flex-1"
          >
            <Text
              className="text-sm text-neutral-600 leading-snug line-clamp-2"
              data-testid="product-title"
            >
              {product.title}
            </Text>
          </LocalizedClientLink>

          {cheapestPrice && <PriceBadge price={cheapestPrice} />}
        </div>

        <MetaTags product={product} />

        <div className="mt-auto">
          <AddToCartButton variantId={variantId} countryCode={countryCode} />
        </div>
      </div>
    </div>
  )
}
