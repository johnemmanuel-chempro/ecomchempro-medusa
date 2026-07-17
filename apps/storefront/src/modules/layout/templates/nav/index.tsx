import { Suspense } from "react"

import { listCategories } from "@lib/data/categories"
import { listLocales } from "@lib/data/locales"
import { getLocale } from "@lib/data/locale-actions"
import { listRegions } from "@lib/data/regions"
import { StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import Image from "next/image"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons"
import { faHeart, faUser } from "@fortawesome/free-regular-svg-icons"
import NavMenu from "@modules/layout/components/nav-menu"

export default async function Nav() {
  const [regions, locales, currentLocale, productCategories] = await Promise.all([
    listRegions().then((regions: StoreRegion[]) => regions),
    listLocales(),
    getLocale(),
    listCategories({ limit: 500 }),
  ])

  return (
    <div className="sticky top-0 inset-x-0 z-50 group">
      <div className="bg-[#045a9c] text-[#ffd95a] flex items-center justify-center py-1">
        <p>Find a Chemist Outlet Store Near You: Here!  **Online prices may differ from in-store prices.</p>
      </div>
      <header className="relative  mx-auto  duration-200  bg-[#26a1da] text-[#ffffff]">
        <nav className="content-container h-[120px] txt-xsmall-plus flex items-center justify-between w-full text-small-regular">
          <div className="flex items-center h-full mr-4">
            <LocalizedClientLink
              href="/"
              className="txt-compact-xlarge-plus hover:text-ui-fg-base uppercase"
              data-testid="nav-store-link"
            >

              <Image src="https://www.chempro.com.au/image/catalog/chem-pro/logo-chempro-white.png" alt="Logo" width={270} height={84} />
            </LocalizedClientLink>
          </div>

          <div className="flex items-center gap-x-6 h-16 flex-1 basis-0 justify-end bg-[#137ec7] rounded-lg px-4">
            <div className="hidden small:flex items-center gap-x-1 h-full flex-1">
              <div className="flex items-center bg-white h-[40px] rounded-md w-full overflow-hidden">
                <input type="text" placeholder="Search" className="w-full h-full rounded-lg px-4 border-none outline-none text-[#045a9c]" />
                <button className="bg-[#045a9c] rounded-sm px-4 flex items-center gap-x-1 justify-center h-full border-2 border-white rounded-r-md">
                  <FontAwesomeIcon icon={faMagnifyingGlass} size="lg" /> Search
                </button>
              </div>
            </div>

            <div className="hidden small:flex items-center gap-x-1 h-full">
              <FontAwesomeIcon icon={faHeart} size="lg" />
              <LocalizedClientLink
                className="hover:text-ui-fg-base"
                href="#"
                data-testid="nav-account-link"
              >
                FAVOURITES
              </LocalizedClientLink>
            </div>
            <div className="hidden small:flex items-center gap-x-1 h-full">
              <FontAwesomeIcon icon={faUser} size="lg" />
              <LocalizedClientLink
                className="hover:text-ui-fg-base"
                href="/account"
                data-testid="nav-account-link"
              >
                ACCOUNT
              </LocalizedClientLink>
            </div>
            <div className="flex items-center gap-x-2 ">
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
            </div>
          </div>
        </nav>
        <div className="relative border-y border-[#41adde]">
          <div className="py-4 content-container">
            <NavMenu categories={productCategories ?? []} />
          </div>
        </div>

    
      </header>
    </div>
  )
}
