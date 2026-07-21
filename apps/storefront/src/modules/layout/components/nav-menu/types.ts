import { HttpTypes } from "@medusajs/types"

export type NavCategory = Pick<
  HttpTypes.StoreProductCategory,
  "id" | "name" | "handle" | "category_children" | "parent_category"
>

export const navMenuItems = [
  { label: "PRODUCTS", href: "/store" },
  { label: "CLEARANCE", href: "/store" },
  { label: "BRANDS", href: "/store" },
  { label: "CATALOGUE", href: "/store" },
  { label: "PRESCRIPTIONS", href: "/store" },
  { label: "COMPOUNDING", href: "/store" },
  { label: "QUIT SMOKING", href: "/store" },
  { label: "IN STORE SERVICE", href: "/store" },
] as const

export const categoryItemClassName =
  "flex w-full items-center justify-between gap-2 text-left px-2 py-1.5 rounded-md text-sm hover:bg-[#045a9c] hover:text-white"

export function getCategoryChildren(
  category: NavCategory,
  allCategories: NavCategory[]
) {
  if (category.category_children?.length) {
    return category.category_children as NavCategory[]
  }
  return allCategories.filter((c) => c.parent_category?.id === category.id)
}

export function categoryHasChildren(
  category: NavCategory,
  allCategories: NavCategory[]
) {
  return getCategoryChildren(category, allCategories).length > 0
}

export function getRootCategories(categories: NavCategory[]) {
  return categories.filter((c) => !c.parent_category)
}
