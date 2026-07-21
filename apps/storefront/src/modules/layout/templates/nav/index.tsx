import { Suspense } from "react"

import { listCategories } from "@lib/data/categories"
import CartButton from "@modules/layout/components/cart-button"
import HeaderNav from "@modules/layout/components/nav-menu"

export default async function Nav() {
  const productCategories = await listCategories({ limit: 500 })

  return (
    <div className="sticky top-0 inset-x-0 z-50 group">
      <div className="bg-[#045a9c] text-[#ffd95a] flex items-center justify-center py-1 px-3">
        <p className="text-center text-[11px] small:text-sm leading-snug">
          Find a Chemist Outlet Store Near You: Here! **Online prices may differ
          from in-store prices.
        </p>
      </div>
      <header className="relative mx-auto duration-200 bg-[#26a1da] text-[#ffffff]">
        <HeaderNav
          categories={productCategories ?? []}
          cart={
            <Suspense
              fallback={
                <span
                  className="hover:text-ui-fg-base flex gap-2"
                  data-testid="nav-cart-link"
                >
                  Cart (0)
                </span>
              }
            >
              <CartButton />
            </Suspense>
          }
        />
      </header>
    </div>
  )
}
