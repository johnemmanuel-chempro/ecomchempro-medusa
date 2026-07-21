"use client"

import {
  faChevronLeft,
  faChevronRight,
  faLocationDot,
  faXmark,
} from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useEffect, useMemo, useState } from "react"
import {
  NavCategory,
  categoryHasChildren,
  getCategoryChildren,
  getRootCategories,
  navMenuItems,
} from "./types"

type Panel =
  | { type: "root" }
  | { type: "products" }
  | { type: "category"; category: NavCategory }

type NavMenuMobileProps = {
  categories: NavCategory[]
  open: boolean
  onClose: () => void
}

export default function NavMenuMobile({
  categories,
  open,
  onClose,
}: NavMenuMobileProps) {
  const [history, setHistory] = useState<Panel[]>([{ type: "root" }])

  const rootCategories = useMemo(
    () => getRootCategories(categories),
    [categories]
  )

  useEffect(() => {
    if (open) {
      setHistory([{ type: "root" }])
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  const current = history[history.length - 1] ?? ({ type: "root" } as Panel)

  const push = (panel: Panel) => setHistory((h) => [...h, panel])
  const back = () => {
    if (history.length <= 1) {
      onClose()
      return
    }
    setHistory((h) => h.slice(0, -1))
  }

  const title =
    current.type === "root"
      ? "Menu"
      : current.type === "products"
        ? "Products"
        : current.category.name

  const panelCategories =
    current.type === "products"
      ? rootCategories
      : current.type === "category"
        ? getCategoryChildren(current.category, categories)
        : []

  return (
    <div className="fixed inset-0 z-[80] small:hidden" data-testid="mobile-nav">
      <button
        type="button"
        aria-label="Close menu backdrop"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      <div className="absolute inset-y-0 left-0 flex w-full max-w-sm flex-col bg-white text-neutral-900 shadow-xl">
        <div className="flex items-center justify-between gap-3 bg-[#045a9c] px-4 py-3 text-white">
          <div className="flex min-w-0 items-center gap-2">
            {history.length > 1 ? (
              <button
                type="button"
                onClick={back}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md hover:bg-white/10"
                aria-label="Back"
              >
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>
            ) : (
              <span className="w-9" />
            )}
            <p className="truncate text-base font-semibold">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-white/10"
            aria-label="Close menu"
            data-testid="mobile-nav-close"
          >
            <FontAwesomeIcon icon={faXmark} size="lg" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {current.type === "root" && (
            <ul className="divide-y divide-neutral-100 py-1">
              {navMenuItems.map((item) => (
                <li key={item.label}>
                  {item.label === "PRODUCTS" ? (
                    <button
                      type="button"
                      onClick={() => push({ type: "products" })}
                      className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm font-semibold uppercase tracking-wide hover:bg-neutral-50"
                    >
                      {item.label}
                      <FontAwesomeIcon
                        icon={faChevronRight}
                        className="text-xs text-neutral-400"
                      />
                    </button>
                  ) : (
                    <LocalizedClientLink
                      href={item.href}
                      onClick={onClose}
                      className="flex w-full items-center justify-between px-4 py-3.5 text-sm font-semibold uppercase tracking-wide hover:bg-neutral-50"
                    >
                      {item.label}
                    </LocalizedClientLink>
                  )}
                </li>
              ))}
              <li className="p-4">
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-[#045a9c] px-4 py-3 text-sm font-bold uppercase text-white"
                >
                  <FontAwesomeIcon icon={faLocationDot} />
                  Find ChemPro
                </button>
              </li>
            </ul>
          )}

          {(current.type === "products" || current.type === "category") && (
            <ul className="divide-y divide-neutral-100 py-1">
              {current.type === "category" && (
                <li>
                  <LocalizedClientLink
                    href={`/categories/${current.category.handle}`}
                    onClick={onClose}
                    className="block px-4 py-3.5 text-sm font-semibold text-[#045a9c] hover:bg-neutral-50"
                  >
                    View all {current.category.name}
                  </LocalizedClientLink>
                </li>
              )}

              {panelCategories.length === 0 ? (
                <li className="px-4 py-6 text-sm text-neutral-500">
                  No categories yet
                </li>
              ) : (
                panelCategories.map((category) => {
                  const hasKids = categoryHasChildren(category, categories)
                  if (hasKids) {
                    return (
                      <li key={category.id}>
                        <button
                          type="button"
                          onClick={() => push({ type: "category", category })}
                          className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm hover:bg-neutral-50"
                        >
                          <span>{category.name}</span>
                          <FontAwesomeIcon
                            icon={faChevronRight}
                            className="text-xs text-neutral-400"
                          />
                        </button>
                      </li>
                    )
                  }
                  return (
                    <li key={category.id}>
                      <LocalizedClientLink
                        href={`/categories/${category.handle}`}
                        onClick={onClose}
                        className="block px-4 py-3.5 text-sm hover:bg-neutral-50"
                      >
                        {category.name}
                      </LocalizedClientLink>
                    </li>
                  )
                })
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
