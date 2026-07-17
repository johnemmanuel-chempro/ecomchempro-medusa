"use client"

import { faCaretUp, faChevronRight, faLocationDot } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useEffect, useRef, useState } from "react"

type NavCategory = Pick<
  HttpTypes.StoreProductCategory,
  "id" | "name" | "handle" | "category_children" | "parent_category"
>

const navMenuItems = [
  { label: "PRODUCTS", href: "/" },
  { label: "CLEARANCE", href: "/" },
  { label: "BRANDS", href: "/" },
  { label: "CATALOGUE", href: "/" },
  { label: "PRESCRIPTIONS", href: "/" },
  { label: "COMPOUNDING", href: "/" },
  { label: "QUIT SMOKING", href: "/" },
  { label: "IN STORE SERVICE", href: "/" },
]

const itemClassName =
  "flex w-full items-center justify-between gap-2 text-left px-2 py-1.5 rounded-md text-sm hover:bg-[#045a9c] hover:text-white"

type NavMenuProps = {
  categories: NavCategory[]
}

export default function NavMenu({ categories }: NavMenuProps) {
  const [productsOpen, setProductsOpen] = useState(false)
  const [selectedL1, setSelectedL1] = useState<NavCategory | null>(null)
  const [selectedL2, setSelectedL2] = useState<NavCategory | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownHeight, setDropdownHeight] = useState<number>()

  const getChildren = (category: NavCategory) => {
    if (category.category_children?.length) {
      return category.category_children
    }
    return categories.filter((c) => c.parent_category?.id === category.id)
  }

  const hasChildren = (category: NavCategory) => getChildren(category).length > 0

  const level1 = categories.filter((c) => !c.parent_category)
  const level2 = selectedL1 ? getChildren(selectedL1) : []
  const level3 = selectedL2 ? getChildren(selectedL2) : []

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
    if (!productsOpen) {
      return
    }

    const updateDropdownHeight = () => {
      const top = dropdownRef.current?.getBoundingClientRect().top

      if (top !== undefined) {
        setDropdownHeight(Math.max(0, window.innerHeight - top))
      }
    }

    updateDropdownHeight()
    window.addEventListener("resize", updateDropdownHeight)

    return () => window.removeEventListener("resize", updateDropdownHeight)
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
    const withChildren = hasChildren(category)
    const selectedClass = selected ? "bg-[#045a9c] text-white" : ""

    if (withChildren && onExpand) {
      return (
        <button
          key={category.id}
          type="button"
          onClick={() => onExpand(category)}
          className={`${itemClassName} ${selectedClass}`}
        >
          <span>{category.name}</span>
          <FontAwesomeIcon icon={faChevronRight} className="text-xs opacity-70" />
        </button>
      )
    }

    return (
      <LocalizedClientLink
        key={category.id}
        href={`/categories/${category.handle}`}
        onClick={closeDropdown}
        className={`${itemClassName} ${selectedClass}`}
      >
        <span>{category.name}</span>
      </LocalizedClientLink>
    )
  }

  return (
    <div ref={menuRef}>
      <div className="flex items-center justify-between gap-x-4">
        <div className="flex items-center gap-x-4 justify-around flex-1">
          {navMenuItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => handleNavItemClick(item.label)}
              className={`relative hover:bg-[#045a9c] duration-200 rounded-md px-2 py-1 cursor-pointer uppercase text-sm ${
                item.label === "PRODUCTS" && productsOpen
                  ? "bg-[#045a9c]"
                  : ""
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
            className="bg-[#045a9c] text-white px-4 py-2 rounded-md border border-[#ffffff]"
          >
            <FontAwesomeIcon icon={faLocationDot} size="lg" />
            FIND CHEMPROs
          </button>
        </div>
      </div>

      {productsOpen && (
        <div
          ref={dropdownRef}
          className="absolute inset-x-0 top-full z-50 mt-1 bg-white text-black shadow-lg"
          style={{ height: dropdownHeight }}
        >
          <div className="flex items-stretch gap-x-0 h-full">
            <div className="p-2 min-w-[250px] overflow-y-auto">
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
              <div className="p-2 min-w-[200px] overflow-y-auto border-l-2 border-indigo-500">
                {level2.map((category) =>
                  renderCategoryItem(category, {
                    selected: selectedL2?.id === category.id,
                    onExpand: setSelectedL2,
                  })
                )}
              </div>
            )}

            {selectedL2 && level3.length > 0 && (
              <div className="p-2 min-w-[200px] overflow-y-auto border-l-2 border-indigo-500">
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
