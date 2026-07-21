import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faStar } from "@fortawesome/free-solid-svg-icons"
import { HttpTypes } from "@medusajs/types"

type MetaTagsProps = {
  product: HttpTypes.StoreProduct
}

function readMeta(product: HttpTypes.StoreProduct, key: string) {
  const value = product.metadata?.[key]
  if (value === undefined || value === null || value === "") return null
  return String(value)
}

export default function MetaTags({ product }: MetaTagsProps) {
  const rating = readMeta(product, "rating") ?? readMeta(product, "review_rating")
  const sold =
    readMeta(product, "sold_count") ??
    readMeta(product, "units_sold") ??
    readMeta(product, "sold")
  const exclusiveMeta = readMeta(product, "exclusive")
  const exclusive =
    exclusiveMeta === "true" ||
    product.tags?.some((t) => t.value?.toLowerCase() === "exclusive")
  // Show Exclusive by default until metadata explicitly sets exclusive=false
  const showExclusive =
    exclusiveMeta === "false" ? false : exclusive || exclusiveMeta === null

  const displayRating = rating ?? "4.9"
  const displaySold = sold ?? "1,000+"

  return (
    <div className="flex flex-wrap items-center gap-1.5" data-testid="product-meta-tags">
      <span className="inline-flex items-center gap-1 rounded bg-[#f0a04b] px-1.5 py-0.5 text-[10px] font-bold text-white">
        <FontAwesomeIcon icon={faStar} className="text-[9px]" />
        {displayRating}
      </span>

      <span className="inline-flex items-center rounded bg-neutral-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
        {displaySold} sold
      </span>

      {showExclusive && (
        <span className="inline-flex items-center rounded bg-neutral-700 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          Exclusive
        </span>
      )}
    </div>
  )
}
