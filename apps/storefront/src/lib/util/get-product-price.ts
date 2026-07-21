import { HttpTypes } from "@medusajs/types"
import { getPercentageDiff } from "./get-percentage-diff"
import { convertToLocale } from "./money"

type VariantWithPrice = HttpTypes.StoreProductVariant & {
  calculated_price?: {
    calculated_amount: number
    original_amount: number
    currency_code: string
    calculated_price: {
      price_list_type: string
    }
  }
}

export const getPricesForVariant = (variant: VariantWithPrice) => {
  const calculated = variant?.calculated_price
  const calculatedAmount =
    calculated?.calculated_amount ??
    (calculated as { amount?: number } | undefined)?.amount

  if (calculatedAmount == null || Number.isNaN(Number(calculatedAmount))) {
    return null
  }

  const originalAmount =
    calculated?.original_amount ?? calculatedAmount
  const currencyCode = calculated?.currency_code ?? "aud"
  const priceListType =
    calculated?.calculated_price?.price_list_type ?? "default"

  return {
    calculated_price_number: calculatedAmount,
    calculated_price: convertToLocale({
      amount: calculatedAmount,
      currency_code: currencyCode,
    }),
    original_price_number: originalAmount,
    original_price: convertToLocale({
      amount: originalAmount,
      currency_code: currencyCode,
    }),
    currency_code: currencyCode,
    price_type: priceListType,
    percentage_diff: getPercentageDiff(originalAmount, calculatedAmount),
  }
}

export function getProductPrice({
  product,
  variantId,
}: {
  product: HttpTypes.StoreProduct
  variantId?: string
}) {
  if (!product || !product.id) {
    throw new Error("No product provided")
  }

  const cheapestPrice = () => {
    if (!product || !product.variants?.length) {
      return null
    }

    const cheapestVariant = (product.variants as VariantWithPrice[])
      .filter((v) => !!v.calculated_price)
      .sort((a, b) => {
        return (
          (a.calculated_price?.calculated_amount ?? 0) -
          (b.calculated_price?.calculated_amount ?? 0)
        )
      })[0]

    return getPricesForVariant(cheapestVariant)
  }

  const variantPrice = () => {
    if (!product || !variantId) {
      return null
    }

    const variant = product.variants?.find(
      (v) => v.id === variantId || v.sku === variantId
    ) as VariantWithPrice | undefined

    if (!variant) {
      return null
    }

    return getPricesForVariant(variant)
  }

  return {
    product,
    cheapestPrice: cheapestPrice(),
    variantPrice: variantPrice(),
  }
}
