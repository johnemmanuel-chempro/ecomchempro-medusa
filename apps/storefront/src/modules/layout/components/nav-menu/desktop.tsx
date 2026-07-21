"use client"

import {
  faCaretUp,
  faChevronRight,
  faLocationDot,
} from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useEffect, useRef, useState } from "react"
import {
  NavCategory,
  categoryHasChildren,
  categoryItemClassName,
  getCategoryChildren,
  getRootCategories,
  navMenuItems,
} from "./types"

type NavMenuDesktopProps = {
  categories: NavCategory[]
}

export default function NavMenuDesktop({ categories }: NavMenuDesktopProps) {
  const [productsOpen, setProductsOpen] = useState(false)
  const [selectedL1, setSelectedL1] = useState<NavCategory | null>(null)
  const [selectedL2, setSelectedL2] = useState<NavCategory | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [dropdownStyle, setDropdownStyle] = useState<{
    top: number
    height: number
  }>()

  const level1 = getRootCategories(categories)
  const level2 = selectedL1
    ? getCategoryChildren(selectedL1, categories)
    : []
  const level3 = selectedL2
    ? getCategoryChildren(selectedL2, categories)
    : []

  const closeDropdown = () => {
    setProductsOpen(false)
    setSelectedL1(null)
    setSelectedL2(null)
  }

  const handleNavItemClick = (label: string) => {
    if (label === "PRODUCTS") {
      setProductsOpen((open) => {
        if (open) {
          setSelectedL1(null)
          setSelectedL2(null)
        }
        return !open
      })
      return
    }
    closeDropdown()
  }

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        closeDropdown()
      }
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [])

  useEffect(() => {
    if (!productsOpen) return

    const updateDropdownPosition = () => {
      const bottom = menuRef.current?.getBoundingClientRect().bottom
      if (bottom !== undefined) {
        const top = bottom + 4
        setDropdownStyle({
          top,
          height: Math.max(0, window.innerHeight - top),
        })
      }
    }

    updateDropdownPosition()
    window.addEventListener("resize", updateDropdownPosition)
    window.addEventListener("scroll", updateDropdownPosition, true)

    return () => {
      window.removeEventListener("resize", updateDropdownPosition)
      window.removeEventListener("scroll", updateDropdownPosition, true)
    }
  }, [productsOpen])

  const renderCategoryItem = (
    category: NavCategory,
    {
      selected,
      onExpand,
    }: {
      selected?: boolean
      onExpand?: (category: NavCategory) => void
    }
  ) => {
    const withChildren = categoryHasChildren(category, categories)
    const selectedClass = selected ? "bg-[#045a9c] text-white" : ""

    if (withChildren && onExpand) {
      return (
        <button
          key={category.id}
          type="button"
          onClick={() => onExpand(category)}
          className={`${categoryItemClassName} ${selectedClass}`}
        >
          <span className="m-2">{category.name}</span>
          <FontAwesomeIcon
            icon={faChevronRight}
            className="text-xs opacity-70"
          />
        </button>
      )
    }

    return (
      <LocalizedClientLink
        key={category.id}
        href={`/categories/${category.handle}`}
        onClick={closeDropdown}
        className={`${categoryItemClassName} ${selectedClass}`}
      >
        <span className="m-2">{category.name}</span>
      </LocalizedClientLink>
    )
  }

  return (
    <div ref={menuRef}>
      <div className="flex items-center justify-between gap-x-4">
        <div className="flex items-center gap-x-2 justify-around flex-1 flex-wrap">
          {navMenuItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => handleNavItemClick(item.label)}
              className={`relative hover:bg-[#045a9c] duration-200 rounded-md p-2 px-3 cursor-pointer uppercase text-sm ${
                item.label === "PRODUCTS" && productsOpen ? "bg-[#045a9c]" : ""
              }`}
            >
              {item.label}
              {item.label === "PRODUCTS" && productsOpen && (
                <FontAwesomeIcon
                  icon={faCaretUp}
                  className="pointer-events-none absolute left-1/2 top-[43px] z-[60] -translate-x-1/2 text-white"
                  size="xl"
                />
              )}
            </button>
          ))}
        </div>
        <div>
          <button
            type="button"
            className="bg-[#045a9c] text-white px-4 py-2 rounded-md border border-[#ffffff] whitespace-nowrap"
          >
            <FontAwesomeIcon icon={faLocationDot} size="lg" className="mr-2" />
            FIND CHEMPRO
          </button>
        </div>
      </div>

      {productsOpen && (
        <div
          className="fixed inset-x-0 z-50 bg-white text-black shadow-lg mt-3"
          style={dropdownStyle}
        >
          <div className="flex items-stretch gap-x-0 h-full">
            <div className="min-w-[300px] overflow-y-auto p-5 mt-2">
              {level1.length === 0 ? (
                <p className="px-2 py-1 text-sm text-ui-fg-muted">
                  No categories yet
                </p>
              ) : (
                level1.map((category) =>
                  renderCategoryItem(category, {
                    selected: selectedL1?.id === category.id,
                    onExpand: (c) => {
                      setSelectedL1(c)
                      setSelectedL2(null)
                    },
                  })
                )
              )}
            </div>

            {selectedL1 && level2.length > 0 && (
              <div className="min-w-[300px] overflow-y-auto border-l border-neutral-200 p-5 mt-2">
                {level2.map((category) =>
                  renderCategoryItem(category, {
                    selected: selectedL2?.id === category.id,
                    onExpand: setSelectedL2,
                  })
                )}
              </div>
            )}

            {selectedL2 && level3.length > 0 && (
              <div className="min-w-[200px] overflow-y-auto border-l border-neutral-200 p-5 mt-2">
                {level3.map((category) =>
                  renderCategoryItem(category, {})
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
