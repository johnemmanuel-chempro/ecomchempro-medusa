import { Text, clx } from "@modules/common/components/ui"
import { VariantPrice } from "types/global"

type PriceBadgeProps = {
  price: VariantPrice
}

export default function PriceBadge({ price }: PriceBadgeProps) {
  const isSale = price.price_type === "sale"
  const savings =
    isSale && price.original_price_number > price.calculated_price_number
      ? price.original_price_number - price.calculated_price_number
      : 0

  const savingsLabel = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: price.currency_code,
  }).format(savings)

  return (
    <div
      className={clx(
        "relative shrink-0 min-w-[5.5rem] rounded-md bg-[#045a9c] text-center shadow-sm",
        isSale && "pt-2"
      )}
      data-testid="price-badge"
    >
      {isSale && Number(price.percentage_diff) > 0 && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-[#f0a04b] px-2 py-0.5 text-[10px] font-bold leading-none text-red-700 whitespace-nowrap">
          -{price.percentage_diff}%
        </span>
      )}

      <div className="px-2.5 py-2">
        <Text
          className="text-sm small:text-base font-bold text-white leading-tight"
          data-testid="price"
        >
          {price.calculated_price}
        </Text>
      </div>

      {isSale && savings > 0 && (
        <div className="rounded-b-md bg-white px-1.5 py-1 border-t border-[#045a9c]/40">
          <Text
            className="text-[9px] small:text-[10px] font-semibold text-[#045a9c] leading-tight uppercase"
            data-testid="price-savings"
          >
            {savingsLabel} OFF RRP
          </Text>
        </div>
      )}
    </div>
  )
}
