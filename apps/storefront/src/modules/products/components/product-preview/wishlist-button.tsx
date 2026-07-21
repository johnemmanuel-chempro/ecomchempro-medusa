"use client"

import { useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faHeart as faHeartSolid } from "@fortawesome/free-solid-svg-icons"
import { faHeart as faHeartRegular } from "@fortawesome/free-regular-svg-icons"

type WishlistButtonProps = {
  productId: string
}

export default function WishlistButton({ productId }: WishlistButtonProps) {
  const [active, setActive] = useState(false)

  return (
    <button
      type="button"
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={active}
      data-testid="wishlist-button"
      data-product-id={productId}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        // Stub: wire to customer wishlist / localStorage later
        setActive((v) => !v)
      }}
      className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200/90 text-neutral-600 shadow-sm transition hover:bg-white hover:text-red-500"
    >
      <FontAwesomeIcon
        icon={active ? faHeartSolid : faHeartRegular}
        className={active ? "text-red-500" : undefined}
      />
    </button>
  )
}
