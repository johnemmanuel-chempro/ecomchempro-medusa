"use client"

import { useState } from "react"
import { addToCart } from "@lib/data/cart"
import Spinner from "@modules/common/icons/spinner"

type AddToCartButtonProps = {
  variantId?: string | null
  countryCode: string
  disabled?: boolean
}

export default function AddToCartButton({
  variantId,
  countryCode,
  disabled,
}: AddToCartButtonProps) {
  const [isAdding, setIsAdding] = useState(false)

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!variantId || disabled || isAdding) return

    setIsAdding(true)
    try {
      await addToCart({
        variantId,
        quantity: 1,
        countryCode,
      })
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <button
      type="button"
      data-testid="product-preview-add-to-cart"
      disabled={!variantId || disabled || isAdding}
      onClick={handleClick}
      className="mt-3 flex w-full items-center justify-center rounded-md bg-[#045a9c] px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#034a80] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isAdding ? <Spinner size="16" /> : "Add to cart"}
    </button>
  )
}
