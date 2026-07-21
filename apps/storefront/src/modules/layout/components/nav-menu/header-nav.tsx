"use client"

import { ReactNode, useState } from "react"
import Image from "next/image"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faBars,
  faMagnifyingGlass,
} from "@fortawesome/free-solid-svg-icons"
import { faHeart, faUser } from "@fortawesome/free-regular-svg-icons"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import NavMenuDesktop from "./desktop"
import NavMenuMobile from "./mobile"
import { NavCategory } from "./types"

type HeaderNavProps = {
  categories: NavCategory[]
  cart: ReactNode
}

export default function HeaderNav({ categories, cart }: HeaderNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <nav className="content-container flex h-[88px] small:h-[120px] w-full items-center justify-between text-small-regular">
        <div className="flex items-center gap-3 mr-3 min-w-0">
          <button
            type="button"
            className="small:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#137ec7] hover:bg-[#045a9c]"
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            data-testid="mobile-nav-button"
            onClick={() => setMobileOpen(true)}
          >
            <FontAwesomeIcon icon={faBars} size="lg" />
          </button>

          <LocalizedClientLink
            href="/"
            className="txt-compact-xlarge-plus hover:text-ui-fg-base uppercase shrink-0"
            data-testid="nav-store-link"
          >
            <Image
              src="https://www.chempro.com.au/image/catalog/chem-pro/logo-chempro-white.png"
              alt="ChemPro"
              width={270}
              height={84}
              className="h-10 w-auto small:h-[84px]"
              priority
            />
          </LocalizedClientLink>
        </div>

        <div className="flex h-14 small:h-16 flex-1 basis-0 items-center justify-end gap-x-3 small:gap-x-6 rounded-lg bg-[#137ec7] px-2 small:px-4">
          <div className="hidden small:flex h-full flex-1 items-center gap-x-1">
            <div className="flex h-[40px] w-full items-center overflow-hidden rounded-md bg-white">
              <input
                type="text"
                placeholder="Search"
                className="h-full w-full rounded-lg border-none px-4 text-[#045a9c] outline-none"
              />
              <button
                type="button"
                className="flex h-full items-center justify-center gap-x-1 rounded-r-md border-2 border-white bg-[#045a9c] px-4"
              >
                <FontAwesomeIcon icon={faMagnifyingGlass} size="lg" /> Search
              </button>
            </div>
          </div>

          <button
            type="button"
            className="small:hidden flex h-10 w-10 items-center justify-center rounded-md hover:bg-[#045a9c]"
            aria-label="Search"
          >
            <FontAwesomeIcon icon={faMagnifyingGlass} size="lg" />
          </button>

          <div className="hidden small:flex h-full items-center gap-x-1">
            <FontAwesomeIcon icon={faHeart} size="lg" />
            <LocalizedClientLink
              className="hover:text-ui-fg-base"
              href="#"
              data-testid="nav-favourites-link"
            >
              FAVOURITES
            </LocalizedClientLink>
          </div>

          <div className="hidden small:flex h-full items-center gap-x-1">
            <FontAwesomeIcon icon={faUser} size="lg" />
            <LocalizedClientLink
              className="hover:text-ui-fg-base"
              href="/account"
              data-testid="nav-account-link"
            >
              ACCOUNT
            </LocalizedClientLink>
          </div>

          <LocalizedClientLink
            href="/account"
            className="small:hidden flex h-10 w-10 items-center justify-center rounded-md hover:bg-[#045a9c]"
            aria-label="Account"
          >
            <FontAwesomeIcon icon={faUser} size="lg" />
          </LocalizedClientLink>

          <div className="flex items-center gap-x-2">{cart}</div>
        </div>
      </nav>

      <div className="hidden small:block border-y border-[#3ca7d9] shadow-md">
        <div className="content-container relative py-4">
          <NavMenuDesktop categories={categories} />
        </div>
      </div>

      <NavMenuMobile
        categories={categories}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
    </>
  )
}
